use crate::exercise::{Category, Exercise, MovementPattern};
use crate::profile::Profile;
use crate::session::{SessionExercise, SessionPlan};

/// Temps de transition entre deux exercices (secondes)
const TRANSITION_S: u32 = 15;
const BEGINNER_REST_S: u32 = 60;
const INTERMEDIATE_REST_S: u32 = 45;

pub struct ProgramBuilder<'a> {
    profile: &'a Profile,
    exercises: &'a [Exercise],
}

impl<'a> ProgramBuilder<'a> {
    pub fn new(profile: &'a Profile, exercises: &'a [Exercise]) -> Self {
        Self { profile, exercises }
    }

    /// Génère une séance adaptée au profil.
    /// `day_seed` permet de varier les exercices d'un jour à l'autre
    /// (utiliser le numéro de jour : `Date.now() / 86_400_000 | 0` côté JS).
    pub fn build_session(&self, day_seed: u32) -> SessionPlan {
        let budget_s = self.profile.minutes_per_session as u32 * 60;
        let contraindications = self.profile.all_contraindications();
        let max_difficulty = self.profile.max_difficulty();
        let is_postpartum = self.profile.is_postpartum;

        let eligible: Vec<&Exercise> = self
            .exercises
            .iter()
            .filter(|e| !e.equipment_required)
            .filter(|e| {
                // Les exercices post-partum uniquement sont exclus des autres profils
                if e.postpartum_only {
                    is_postpartum
                } else {
                    true
                }
            })
            .filter(|e| e.is_suitable_for_contraindications(&contraindications))
            .filter(|e| e.is_suitable_for_difficulty(max_difficulty))
            .collect();

        let (sets, rest_s) = self.sets_and_rest();
        let seed = day_seed as usize;

        // Ordre de priorité des catégories. Pour le post-partum, Core en premier
        // car les exercices plancher pelvien sont une priorité.
        let priority_order: &[Category] = if is_postpartum {
            &[
                Category::Core,
                Category::Mobility,
                Category::Hinge,
                Category::Squat,
                Category::Push,
                Category::Pull,
            ]
        } else {
            &[
                Category::Push,
                Category::Pull,
                Category::Squat,
                Category::Hinge,
                Category::Core,
                Category::Mobility,
            ]
        };

        let mut selected: Vec<SessionExercise> = Vec::new();
        let mut used_time_s: u32 = 0;

        for category in priority_order {
            if used_time_s >= budget_s {
                break;
            }

            if let Some(exercise) = self.pick_from_category(&eligible, category, seed) {
                // Les exercices isométriques / mobilité sont affichés en temps,
                // les exercices dynamiques en répétitions.
                let is_timed = matches!(
                    exercise.movement_pattern,
                    MovementPattern::CoreAntiExtension
                        | MovementPattern::CoreAntiRotation
                        | MovementPattern::CoreFlexion
                        | MovementPattern::PelvicFloor
                        | MovementPattern::Mobility
                );

                let candidate = SessionExercise {
                    exercise_id: exercise.id.clone(),
                    sets,
                    reps: if is_timed { None } else { Some(self.reps_per_set()) },
                    duration_s: if is_timed { Some(exercise.duration_s) } else { None },
                    rest_s,
                };

                let needed = candidate.estimated_duration_s() + TRANSITION_S;
                if used_time_s + needed <= budget_s {
                    used_time_s += needed;
                    selected.push(candidate);
                }
            }
        }

        SessionPlan { exercises: selected }
    }

    fn sets_and_rest(&self) -> (u8, u32) {
        use crate::profile::FitnessLevel;
        let (sets, base_rest) = match self.profile.fitness_level {
            FitnessLevel::Beginner => (2, BEGINNER_REST_S),
            FitnessLevel::Intermediate => (3, INTERMEDIATE_REST_S),
        };
        (sets, base_rest + self.profile.rest_bonus_s())
    }

    /// Nombre de répétitions par série pour les exercices dynamiques.
    fn reps_per_set(&self) -> u8 {
        use crate::profile::FitnessLevel;
        match self.profile.fitness_level {
            FitnessLevel::Beginner => 8,
            FitnessLevel::Intermediate => 12,
        }
    }

    fn pick_from_category<'b>(
        &self,
        eligible: &[&'b Exercise],
        category: &Category,
        seed: usize,
    ) -> Option<&'b Exercise> {
        let matching: Vec<&Exercise> = eligible
            .iter()
            .filter(|e| &e.category == category)
            .copied()
            .collect();

        if matching.is_empty() {
            return None;
        }

        Some(matching[seed % matching.len()])
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::exercise::{Category, Contraindication, Exercise, MovementPattern};
    use crate::profile::{AgeBracket, FitnessLevel, Lang, Profile, Sex};

    fn make_exercise(
        id: &str,
        category: Category,
        difficulty: u8,
        contraindications: Vec<Contraindication>,
        postpartum_only: bool,
    ) -> Exercise {
        Exercise {
            id: id.to_string(),
            name_fr: id.to_string(),
            name_en: id.to_string(),
            category,
            movement_pattern: MovementPattern::HorizontalPush,
            difficulty,
            duration_s: 30,
            equipment_required: false,
            postpartum_only,
            contraindications,
            instructions_fr: String::new(),
            instructions_en: String::new(),
        }
    }

    fn make_profile(level: FitnessLevel, minutes: u8, postpartum: bool) -> Profile {
        Profile {
            sex: Sex::Female,
            age_bracket: AgeBracket::Under35,
            fitness_level: level,
            workout_days: vec![0, 2, 4], // Lun, Mer, Ven
            minutes_per_session: minutes,
            is_postpartum: postpartum,
            injury_notes: vec![],
            lang: Lang::Fr,
            disclaimer_accepted_at: Some("2026-01-01".to_string()),
        }
    }

    fn full_catalog() -> Vec<Exercise> {
        vec![
            make_exercise("push_1", Category::Push, 1, vec![], false),
            make_exercise("squat_1", Category::Squat, 1, vec![], false),
            make_exercise("hinge_1", Category::Hinge, 1, vec![], false),
            make_exercise(
                "core_crunch",
                Category::Core,
                1,
                vec![Contraindication::DiastasisRecti],
                false,
            ),
            make_exercise("core_plank", Category::Core, 1, vec![], false),
            make_exercise("mobility_1", Category::Mobility, 1, vec![], false),
            make_exercise("kegel", Category::Core, 1, vec![], true),
        ]
    }

    #[test]
    fn session_fits_within_time_budget() {
        let profile = make_profile(FitnessLevel::Beginner, 20, false);
        let catalog = full_catalog();
        let plan = ProgramBuilder::new(&profile, &catalog).build_session(0);
        assert!(
            plan.total_duration_s() <= 20 * 60,
            "Session {}s exceeds 20min budget",
            plan.total_duration_s()
        );
    }

    #[test]
    fn session_is_not_empty_with_sufficient_time() {
        let profile = make_profile(FitnessLevel::Beginner, 30, false);
        let catalog = full_catalog();
        let plan = ProgramBuilder::new(&profile, &catalog).build_session(0);
        assert!(plan.exercise_count() > 0);
    }

    #[test]
    fn postpartum_excludes_diastasis_exercises() {
        let profile = make_profile(FitnessLevel::Beginner, 30, true);
        let catalog = full_catalog();
        let plan = ProgramBuilder::new(&profile, &catalog).build_session(0);
        let ids: Vec<&str> = plan.exercises.iter().map(|e| e.exercise_id.as_str()).collect();
        assert!(!ids.contains(&"core_crunch"), "core_crunch doit être exclu en post-partum");
    }

    #[test]
    fn non_postpartum_excludes_postpartum_only_exercises() {
        let profile = make_profile(FitnessLevel::Beginner, 30, false);
        let catalog = full_catalog();
        let plan = ProgramBuilder::new(&profile, &catalog).build_session(0);
        let ids: Vec<&str> = plan.exercises.iter().map(|e| e.exercise_id.as_str()).collect();
        assert!(!ids.contains(&"kegel"), "kegel (postpartum_only) ne doit pas apparaître pour un profil non post-partum");
    }

    #[test]
    fn postpartum_can_include_postpartum_only_exercises() {
        let profile = make_profile(FitnessLevel::Beginner, 30, true);
        let catalog = full_catalog();
        let plan = ProgramBuilder::new(&profile, &catalog).build_session(0);
        let ids: Vec<&str> = plan.exercises.iter().map(|e| e.exercise_id.as_str()).collect();
        assert!(
            ids.contains(&"kegel") || ids.contains(&"core_plank"),
            "Un exercice core doit être inclus pour le post-partum"
        );
    }

    #[test]
    fn beginner_gets_2_sets() {
        let profile = make_profile(FitnessLevel::Beginner, 30, false);
        let catalog = full_catalog();
        let plan = ProgramBuilder::new(&profile, &catalog).build_session(0);
        for ex in &plan.exercises {
            assert_eq!(ex.sets, 2, "Le débutant doit avoir 2 séries");
        }
    }

    #[test]
    fn intermediate_gets_3_sets() {
        let profile = make_profile(FitnessLevel::Intermediate, 30, false);
        let catalog = full_catalog();
        let plan = ProgramBuilder::new(&profile, &catalog).build_session(0);
        for ex in &plan.exercises {
            assert_eq!(ex.sets, 3, "L'intermédiaire doit avoir 3 séries");
        }
    }

    #[test]
    fn empty_catalog_returns_empty_session() {
        let profile = make_profile(FitnessLevel::Beginner, 30, false);
        let plan = ProgramBuilder::new(&profile, &[]).build_session(0);
        assert!(plan.is_empty());
    }

    #[test]
    fn different_seeds_can_produce_different_sessions() {
        let profile = make_profile(FitnessLevel::Beginner, 30, false);
        let catalog = vec![
            make_exercise("push_a", Category::Push, 1, vec![], false),
            make_exercise("push_b", Category::Push, 1, vec![], false),
            make_exercise("squat_1", Category::Squat, 1, vec![], false),
            make_exercise("hinge_1", Category::Hinge, 1, vec![], false),
            make_exercise("core_1", Category::Core, 1, vec![], false),
            make_exercise("mobility_1", Category::Mobility, 1, vec![], false),
        ];
        let plan_day0 = ProgramBuilder::new(&profile, &catalog).build_session(0);
        let plan_day1 = ProgramBuilder::new(&profile, &catalog).build_session(1);
        let ids0: Vec<&str> = plan_day0.exercises.iter().map(|e| e.exercise_id.as_str()).collect();
        let ids1: Vec<&str> = plan_day1.exercises.iter().map(|e| e.exercise_id.as_str()).collect();
        // Avec 2 exercices de push, le seed doit en choisir un différent
        assert_ne!(ids0[0], ids1[0], "Le seed doit varier les exercices push");
    }

    #[test]
    fn high_difficulty_exercises_excluded_for_beginner() {
        let profile = make_profile(FitnessLevel::Beginner, 30, false);
        let catalog = vec![
            make_exercise("push_hard", Category::Push, 3, vec![], false),
            make_exercise("squat_1", Category::Squat, 1, vec![], false),
        ];
        let plan = ProgramBuilder::new(&profile, &catalog).build_session(0);
        let ids: Vec<&str> = plan.exercises.iter().map(|e| e.exercise_id.as_str()).collect();
        assert!(!ids.contains(&"push_hard"), "L'exercice difficulty=3 doit être exclu pour un débutant");
    }

    #[test]
    fn age_45_plus_gets_longer_rest() {
        let mut profile = make_profile(FitnessLevel::Beginner, 30, false);
        profile.age_bracket = AgeBracket::Age45Plus;
        let catalog = full_catalog();
        let plan = ProgramBuilder::new(&profile, &catalog).build_session(0);
        // rest_s doit être BEGINNER_REST_S (60) + 15 = 75
        for ex in &plan.exercises {
            assert_eq!(ex.rest_s, 75, "Les 45+ doivent avoir 75s de repos");
        }
    }

    #[test]
    fn very_short_session_may_be_empty_if_no_exercise_fits() {
        let profile = make_profile(FitnessLevel::Beginner, 1, false); // 1 minute
        let catalog = full_catalog();
        // 1 min = 60s, un exercice beginner minimum = 2×30s + 1×60s + 15s = 135s > 60s
        let plan = ProgramBuilder::new(&profile, &catalog).build_session(0);
        assert!(plan.is_empty(), "Aucun exercice ne tient dans 1 minute");
    }
}
