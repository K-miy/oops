mod exercise;
mod profile;
mod program;
mod session;

pub use exercise::Exercise;
pub use profile::Profile;
pub use program::ProgramBuilder;
pub use session::{CompletedSession, SessionPlan};

use wasm_bindgen::prelude::*;

/// Logique pure (testable sans navigateur) : parse → génère → sérialise.
pub fn build_session_inner(
    profile_json: &str,
    exercises_json: &str,
    day_seed: u32,
) -> Result<String, String> {
    let profile: profile::Profile = serde_json::from_str(profile_json)
        .map_err(|e| format!("Profile parse error: {e}"))?;

    let exercises: Vec<exercise::Exercise> = serde_json::from_str(exercises_json)
        .map_err(|e| format!("Exercises parse error: {e}"))?;

    let plan = program::ProgramBuilder::new(&profile, &exercises).build_session(day_seed);

    serde_json::to_string(&plan).map_err(|e| format!("Serialize error: {e}"))
}

/// Binding WASM exposé à JavaScript.
/// Délègue à `build_session_inner`, convertit l'erreur en `JsValue`.
#[wasm_bindgen]
pub fn build_session(
    profile_json: &str,
    exercises_json: &str,
    day_seed: u32,
) -> Result<String, JsValue> {
    build_session_inner(profile_json, exercises_json, day_seed)
        .map_err(|e| JsValue::from_str(&e))
}

#[cfg(test)]
mod tests {
    use super::*;

    const PROFILE_JSON: &str = r#"{
        "sex": "female",
        "age_bracket": "under_35",
        "fitness_level": "beginner",
        "workout_days": [0, 2, 4],
        "minutes_per_session": 30,
        "is_postpartum": false,
        "injury_notes": [],
        "lang": "fr",
        "disclaimer_accepted_at": "2026-01-01"
    }"#;

    const EXERCISES_JSON: &str = r#"[
        {
            "id": "push_1",
            "name_fr": "Pompe sur les genoux",
            "name_en": "Knee push-up",
            "category": "push",
            "movement_pattern": "horizontal_push",
            "difficulty": 1,
            "duration_s": 30,
            "equipment_required": false,
            "postpartum_only": false,
            "contraindications": [],
            "instructions_fr": "Depuis une position à quatre pattes, abaissez la poitrine.",
            "instructions_en": "From a kneeling position, lower your chest."
        },
        {
            "id": "squat_1",
            "name_fr": "Squat au poids de corps",
            "name_en": "Bodyweight squat",
            "category": "squat",
            "movement_pattern": "squat",
            "difficulty": 1,
            "duration_s": 30,
            "equipment_required": false,
            "postpartum_only": false,
            "contraindications": [],
            "instructions_fr": "Pieds écartés à largeur d'épaules, descendez comme pour vous asseoir.",
            "instructions_en": "Feet shoulder-width apart, lower as if sitting."
        }
    ]"#;

    // On teste `build_session_inner` (pas de JsValue → fonctionne sur natif)
    #[test]
    fn build_session_returns_valid_json() {
        let result = build_session_inner(PROFILE_JSON, EXERCISES_JSON, 0);
        assert!(result.is_ok(), "build_session_inner ne doit pas retourner d'erreur");
        let json = result.unwrap();
        assert!(json.contains("exercises"), "Le JSON doit contenir 'exercises'");
    }

    #[test]
    fn build_session_invalid_profile_returns_error() {
        let result = build_session_inner("not json", EXERCISES_JSON, 0);
        assert!(result.is_err());
    }

    #[test]
    fn build_session_invalid_exercises_returns_error() {
        let result = build_session_inner(PROFILE_JSON, "not json", 0);
        assert!(result.is_err());
    }

    #[test]
    fn build_session_empty_exercises_returns_empty_plan() {
        let result = build_session_inner(PROFILE_JSON, "[]", 0);
        assert!(result.is_ok());
        let json = result.unwrap();
        assert!(json.contains("\"exercises\":[]") || json.contains("\"exercises\": []"));
    }
}
