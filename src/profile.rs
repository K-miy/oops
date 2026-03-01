use serde::{Deserialize, Serialize};

use crate::exercise::Contraindication;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum Sex {
    Male,
    Female,
    Other,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum FitnessLevel {
    Beginner,
    Intermediate,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum Lang {
    Fr,
    En,
}

/// Tranche d'âge — utilisée à la place d'un âge exact (inutile pour un programme au poids de corps).
/// Sérialisé en snake_case explicite pour correspondre aux valeurs JS stockées dans IndexedDB.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum AgeBracket {
    #[serde(rename = "under_35")]
    Under35,
    #[serde(rename = "35_44")]
    Age3544,
    #[serde(rename = "45_plus")]
    Age45Plus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Profile {
    pub sex: Sex,
    pub age_bracket: AgeBracket,
    pub fitness_level: FitnessLevel,
    /// Jours d'entraînement choisis par l'utilisateur (0=Lun … 6=Dim).
    /// `#[serde(default)]` → Vec vide si champ absent (vieux profil) : JS détecte et re-onboard.
    #[serde(default)]
    pub workout_days: Vec<u8>,
    /// 15–60 minutes par séance
    pub minutes_per_session: u8,
    pub is_postpartum: bool,
    pub injury_notes: Vec<Contraindication>,
    pub lang: Lang,
    pub disclaimer_accepted_at: Option<String>,
}

impl Profile {
    /// Nombre de séances par semaine — dérivé du nombre de jours sélectionnés.
    pub fn sessions_per_week(&self) -> u8 {
        self.workout_days.len() as u8
    }

    /// Difficulté maximale des exercices autorisés.
    /// Les 45+ ont une difficulté max réduite de 1 (récupération plus longue, prudence).
    pub fn max_difficulty(&self) -> u8 {
        let base: u8 = match self.fitness_level {
            FitnessLevel::Beginner => 2,
            FitnessLevel::Intermediate => 3,
        };
        match self.age_bracket {
            AgeBracket::Age45Plus => base.saturating_sub(1).max(1),
            _ => base,
        }
    }

    /// Bonus de repos entre séries pour les 45+ (récupération neuromusculaire plus lente).
    pub fn rest_bonus_s(&self) -> u32 {
        match self.age_bracket {
            AgeBracket::Age45Plus => 15,
            _ => 0,
        }
    }

    /// Toutes les contre-indications actives (blessures + post-partum si applicable)
    pub fn all_contraindications(&self) -> Vec<Contraindication> {
        let mut contra = self.injury_notes.clone();
        if self.is_postpartum {
            contra.push(Contraindication::Postpartum);
            contra.push(Contraindication::DiastasisRecti);
        }
        contra
    }

    /// Plage RPE cible selon le niveau
    pub fn target_rpe_range(&self) -> (u8, u8) {
        match self.fitness_level {
            FitnessLevel::Beginner => (5, 7),
            FitnessLevel::Intermediate => (6, 8),
        }
    }

    pub fn disclaimer_accepted(&self) -> bool {
        self.disclaimer_accepted_at.is_some()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_profile(level: FitnessLevel, postpartum: bool) -> Profile {
        Profile {
            sex: Sex::Female,
            age_bracket: AgeBracket::Under35,
            fitness_level: level,
            workout_days: vec![0, 2, 4], // Lun, Mer, Ven
            minutes_per_session: 30,
            is_postpartum: postpartum,
            injury_notes: vec![],
            lang: Lang::Fr,
            disclaimer_accepted_at: None,
        }
    }

    #[test]
    fn sessions_per_week_derived_from_workout_days() {
        let p = make_profile(FitnessLevel::Beginner, false);
        assert_eq!(p.sessions_per_week(), 3); // vec![0, 2, 4]
    }

    #[test]
    fn sessions_per_week_empty_is_zero() {
        let mut p = make_profile(FitnessLevel::Beginner, false);
        p.workout_days = vec![];
        assert_eq!(p.sessions_per_week(), 0);
    }

    #[test]
    fn beginner_max_difficulty_is_2() {
        let p = make_profile(FitnessLevel::Beginner, false);
        assert_eq!(p.max_difficulty(), 2);
    }

    #[test]
    fn intermediate_max_difficulty_is_3() {
        let p = make_profile(FitnessLevel::Intermediate, false);
        assert_eq!(p.max_difficulty(), 3);
    }

    #[test]
    fn age_45_plus_reduces_max_difficulty_by_1() {
        let mut p = make_profile(FitnessLevel::Intermediate, false);
        p.age_bracket = AgeBracket::Age45Plus;
        assert_eq!(p.max_difficulty(), 2);
    }

    #[test]
    fn age_45_plus_beginner_difficulty_capped_at_1() {
        let mut p = make_profile(FitnessLevel::Beginner, false);
        p.age_bracket = AgeBracket::Age45Plus;
        // beginner base=2, -1=1, max(1)=1
        assert_eq!(p.max_difficulty(), 1);
    }

    #[test]
    fn under_35_has_no_rest_bonus() {
        let p = make_profile(FitnessLevel::Beginner, false);
        assert_eq!(p.rest_bonus_s(), 0);
    }

    #[test]
    fn age_45_plus_has_15s_rest_bonus() {
        let mut p = make_profile(FitnessLevel::Beginner, false);
        p.age_bracket = AgeBracket::Age45Plus;
        assert_eq!(p.rest_bonus_s(), 15);
    }

    #[test]
    fn postpartum_adds_diastasis_and_postpartum_contraindications() {
        let p = make_profile(FitnessLevel::Beginner, true);
        let contra = p.all_contraindications();
        assert!(contra.contains(&Contraindication::Postpartum));
        assert!(contra.contains(&Contraindication::DiastasisRecti));
    }

    #[test]
    fn non_postpartum_has_no_extra_contraindications() {
        let p = make_profile(FitnessLevel::Beginner, false);
        assert!(p.all_contraindications().is_empty());
    }

    #[test]
    fn injury_notes_included_in_contraindications() {
        let mut p = make_profile(FitnessLevel::Beginner, false);
        p.injury_notes = vec![Contraindication::Knee];
        let contra = p.all_contraindications();
        assert!(contra.contains(&Contraindication::Knee));
    }

    #[test]
    fn postpartum_merges_injury_notes_and_extra_contraindications() {
        let mut p = make_profile(FitnessLevel::Beginner, true);
        p.injury_notes = vec![Contraindication::Wrist];
        let contra = p.all_contraindications();
        assert!(contra.contains(&Contraindication::Wrist));
        assert!(contra.contains(&Contraindication::Postpartum));
        assert!(contra.contains(&Contraindication::DiastasisRecti));
    }

    #[test]
    fn beginner_rpe_range_is_5_to_7() {
        let p = make_profile(FitnessLevel::Beginner, false);
        assert_eq!(p.target_rpe_range(), (5, 7));
    }

    #[test]
    fn intermediate_rpe_range_is_6_to_8() {
        let p = make_profile(FitnessLevel::Intermediate, false);
        assert_eq!(p.target_rpe_range(), (6, 8));
    }

    #[test]
    fn disclaimer_not_accepted_by_default() {
        let p = make_profile(FitnessLevel::Beginner, false);
        assert!(!p.disclaimer_accepted());
    }

    #[test]
    fn disclaimer_accepted_when_date_is_set() {
        let mut p = make_profile(FitnessLevel::Beginner, false);
        p.disclaimer_accepted_at = Some("2026-01-01".to_string());
        assert!(p.disclaimer_accepted());
    }
}
