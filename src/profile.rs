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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Profile {
    pub sex: Sex,
    pub age_years: u8,
    pub weight_kg: f32,
    pub fitness_level: FitnessLevel,
    /// 2–5 séances par semaine
    pub sessions_per_week: u8,
    /// 15–60 minutes par séance
    pub minutes_per_session: u8,
    pub is_postpartum: bool,
    pub injury_notes: Vec<Contraindication>,
    pub lang: Lang,
    pub disclaimer_accepted_at: Option<String>,
}

impl Profile {
    /// Difficulté maximale des exercices autorisés
    pub fn max_difficulty(&self) -> u8 {
        match self.fitness_level {
            FitnessLevel::Beginner => 2,
            FitnessLevel::Intermediate => 3,
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
            age_years: 32,
            weight_kg: 65.0,
            fitness_level: level,
            sessions_per_week: 3,
            minutes_per_session: 30,
            is_postpartum: postpartum,
            injury_notes: vec![],
            lang: Lang::Fr,
            disclaimer_accepted_at: None,
        }
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
