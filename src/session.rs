use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionExercise {
    pub exercise_id: String,
    pub sets: u8,
    /// Répétitions par série (pour exercices dynamiques)
    pub reps: Option<u8>,
    /// Durée d'une série en secondes (pour exercices isométriques/mobilité)
    pub duration_s: Option<u32>,
    /// Repos entre séries en secondes
    pub rest_s: u32,
}

impl SessionExercise {
    /// Durée estimée de l'exercice complet (toutes séries + repos)
    pub fn estimated_duration_s(&self) -> u32 {
        let work_per_set = match self.duration_s {
            Some(d) => d,
            // Estimation : ~3 secondes par répétition
            None => self.reps.unwrap_or(10) as u32 * 3,
        };
        let total_work = work_per_set * self.sets as u32;
        let total_rest = self.rest_s * self.sets.saturating_sub(1) as u32;
        total_work + total_rest
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionPlan {
    pub exercises: Vec<SessionExercise>,
}

impl SessionPlan {
    pub fn total_duration_s(&self) -> u32 {
        self.exercises.iter().map(|e| e.estimated_duration_s()).sum()
    }

    pub fn exercise_count(&self) -> usize {
        self.exercises.len()
    }

    pub fn is_empty(&self) -> bool {
        self.exercises.is_empty()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompletedSession {
    pub date: String,
    pub plan: SessionPlan,
    pub completed_exercise_ids: Vec<String>,
    /// RPE global de la séance (1–10), optionnel
    pub rpe: Option<u8>,
    pub duration_actual_s: Option<u32>,
}

impl CompletedSession {
    /// Taux de complétion de la séance (0.0 – 1.0)
    pub fn completion_rate(&self) -> f32 {
        if self.plan.exercise_count() == 0 {
            return 0.0;
        }
        self.completed_exercise_ids.len() as f32 / self.plan.exercise_count() as f32
    }

    pub fn is_complete(&self) -> bool {
        self.completed_exercise_ids.len() >= self.plan.exercise_count()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn timed(sets: u8, duration_s: u32, rest_s: u32) -> SessionExercise {
        SessionExercise {
            exercise_id: "ex".to_string(),
            sets,
            reps: None,
            duration_s: Some(duration_s),
            rest_s,
        }
    }

    fn reps(sets: u8, reps: u8, rest_s: u32) -> SessionExercise {
        SessionExercise {
            exercise_id: "ex".to_string(),
            sets,
            reps: Some(reps),
            duration_s: None,
            rest_s,
        }
    }

    #[test]
    fn single_set_timed_no_rest() {
        assert_eq!(timed(1, 30, 60).estimated_duration_s(), 30);
    }

    #[test]
    fn two_sets_timed_with_one_rest() {
        // 2×30s + 1×60s = 120s
        assert_eq!(timed(2, 30, 60).estimated_duration_s(), 120);
    }

    #[test]
    fn three_sets_timed_with_two_rests() {
        // 3×30s + 2×60s = 210s
        assert_eq!(timed(3, 30, 60).estimated_duration_s(), 210);
    }

    #[test]
    fn reps_exercise_uses_3s_per_rep() {
        // 2 sets × (10 reps × 3s) + 1 rest × 60s = 60 + 60 = 120s
        assert_eq!(reps(2, 10, 60).estimated_duration_s(), 120);
    }

    #[test]
    fn single_set_reps_no_rest() {
        // 1 set × 10 reps × 3s = 30s
        assert_eq!(reps(1, 10, 60).estimated_duration_s(), 30);
    }

    #[test]
    fn session_plan_totals_all_exercises() {
        let plan = SessionPlan {
            exercises: vec![timed(2, 30, 60), timed(2, 30, 60)],
        };
        assert_eq!(plan.total_duration_s(), 240);
    }

    #[test]
    fn empty_plan_has_zero_duration() {
        let plan = SessionPlan { exercises: vec![] };
        assert_eq!(plan.total_duration_s(), 0);
        assert!(plan.is_empty());
    }

    #[test]
    fn completion_rate_all_done() {
        let plan = SessionPlan {
            exercises: vec![timed(2, 30, 60), timed(2, 30, 60)],
        };
        let completed = CompletedSession {
            date: "2026-01-01".to_string(),
            plan,
            completed_exercise_ids: vec!["a".to_string(), "b".to_string()],
            rpe: Some(6),
            duration_actual_s: None,
        };
        assert_eq!(completed.completion_rate(), 1.0);
        assert!(completed.is_complete());
    }

    #[test]
    fn completion_rate_partial() {
        let plan = SessionPlan {
            exercises: vec![timed(2, 30, 60), timed(2, 30, 60)],
        };
        let completed = CompletedSession {
            date: "2026-01-01".to_string(),
            plan,
            completed_exercise_ids: vec!["a".to_string()],
            rpe: None,
            duration_actual_s: None,
        };
        assert_eq!(completed.completion_rate(), 0.5);
        assert!(!completed.is_complete());
    }

    #[test]
    fn completion_rate_empty_plan_is_zero() {
        let completed = CompletedSession {
            date: "2026-01-01".to_string(),
            plan: SessionPlan { exercises: vec![] },
            completed_exercise_ids: vec![],
            rpe: None,
            duration_actual_s: None,
        };
        assert_eq!(completed.completion_rate(), 0.0);
    }
}
