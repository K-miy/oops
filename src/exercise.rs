use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum Category {
    Push,
    Pull,
    Squat,
    Hinge,
    Core,
    Mobility,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum MovementPattern {
    HorizontalPush,
    VerticalPush,
    HorizontalPull,
    VerticalPull,
    Squat,
    Lunge,
    HipHinge,
    CoreAntiExtension,
    CoreAntiRotation,
    CoreFlexion,
    Mobility,
    PelvicFloor,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum Contraindication {
    Postpartum,
    Back,
    LowerBack,
    Knee,
    Hip,
    Shoulder,
    Wrist,
    DiastasisRecti,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Exercise {
    pub id: String,
    pub name_fr: String,
    pub name_en: String,
    pub category: Category,
    pub movement_pattern: MovementPattern,
    /// 1 = débutant, 2 = intermédiaire, 3 = avancé
    pub difficulty: u8,
    /// Durée d'une série en secondes
    pub duration_s: u32,
    pub equipment_required: bool,
    /// Si true : exercice inclus uniquement pour les profils post-partum
    pub postpartum_only: bool,
    pub contraindications: Vec<Contraindication>,
    pub instructions_fr: String,
    pub instructions_en: String,
}

impl Exercise {
    pub fn is_suitable_for_contraindications(&self, user_contraindications: &[Contraindication]) -> bool {
        for c in &self.contraindications {
            if user_contraindications.contains(c) {
                return false;
            }
        }
        true
    }

    pub fn is_suitable_for_difficulty(&self, max_difficulty: u8) -> bool {
        self.difficulty <= max_difficulty
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_exercise(contraindications: Vec<Contraindication>, difficulty: u8) -> Exercise {
        Exercise {
            id: "test".to_string(),
            name_fr: "Test".to_string(),
            name_en: "Test".to_string(),
            category: Category::Push,
            movement_pattern: MovementPattern::HorizontalPush,
            difficulty,
            duration_s: 30,
            equipment_required: false,
            postpartum_only: false,
            contraindications,
            instructions_fr: String::new(),
            instructions_en: String::new(),
        }
    }

    #[test]
    fn suitable_when_no_contraindications() {
        let ex = make_exercise(vec![], 1);
        assert!(ex.is_suitable_for_contraindications(&[]));
    }

    #[test]
    fn not_suitable_when_contraindication_matches() {
        let ex = make_exercise(vec![Contraindication::DiastasisRecti], 1);
        assert!(!ex.is_suitable_for_contraindications(&[Contraindication::DiastasisRecti]));
    }

    #[test]
    fn suitable_when_user_has_different_contraindication() {
        let ex = make_exercise(vec![Contraindication::Knee], 1);
        assert!(ex.is_suitable_for_contraindications(&[Contraindication::Shoulder]));
    }

    #[test]
    fn suitable_when_exercise_has_no_restrictions_and_user_has_one() {
        let ex = make_exercise(vec![], 1);
        assert!(ex.is_suitable_for_contraindications(&[Contraindication::Knee]));
    }

    #[test]
    fn difficulty_too_high_is_unsuitable() {
        let ex = make_exercise(vec![], 3);
        assert!(!ex.is_suitable_for_difficulty(2));
    }

    #[test]
    fn difficulty_equal_is_suitable() {
        let ex = make_exercise(vec![], 2);
        assert!(ex.is_suitable_for_difficulty(2));
    }

    #[test]
    fn difficulty_lower_is_suitable() {
        let ex = make_exercise(vec![], 1);
        assert!(ex.is_suitable_for_difficulty(3));
    }

    #[test]
    fn multiple_contraindications_any_match_blocks() {
        let ex = make_exercise(vec![Contraindication::Knee, Contraindication::Wrist], 1);
        assert!(!ex.is_suitable_for_contraindications(&[Contraindication::Wrist]));
    }
}
