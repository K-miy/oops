#!/usr/bin/env python3
"""
add_progressions.py — Ajoute le champ progression_to à chaque exercice.

Les chaînes de progression reflètent une difficulté croissante
au sein du même patron de mouvement.
Exercices sans suite = null (fins de chaîne ou exercices isolés).
"""
import json
import glob
import os

# ── Chaînes de progression explicites ──────────────────────────────────────
# Format : { exercise_id: next_exercise_id_or_None }
CHAINS = {
    # ── PUSH ────────────────────────────────────────────────────────────────
    'push_incline':    'push_knee',
    'push_knee':       'push_standard',
    'push_standard':   'push_close',
    'push_close':      'push_diamond',
    'push_wide':       'push_decline',
    'push_diamond':    'push_archer',
    'push_staggered':  'push_t',
    'push_negative':   None,   # technique, pas une progression
    'push_decline':    None,
    'push_t':          None,
    'push_archer':     None,
    'push_pike':       None,

    # ── PULL ────────────────────────────────────────────────────────────────
    'incline_row_table_knees': 'incline_row_table',
    'incline_row_table':       'chair_assisted_row',
    'chair_assisted_row':      'door_row',
    'door_row':                'towel_row',
    'towel_row':               None,
    'band_pull_apart_towel':   None,
    'prone_cobra':             'reverse_snow_angel',
    'reverse_snow_angel':      None,
    'wall_slide':              None,
    'scapular_pushup':         None,

    # ── SQUAT ───────────────────────────────────────────────────────────────
    'wall_sit':             'squat_bodyweight',
    'squat_bodyweight':     'lunge_reverse',
    'squat_sumo':           'squat_tempo',
    'squat_tempo':          'squat_pulse',
    'squat_pulse':          'squat_jump',
    'lunge_reverse':        'lunge_forward',
    'lunge_forward':        'curtsy_lunge',
    'curtsy_lunge':         'lunge_lateral',
    'lunge_lateral':        'step_up',
    'step_up':              'split_squat',
    'split_squat':          'pistol_squat_assisted',
    'pistol_squat_assisted': None,
    'squat_jump':           None,

    # ── HINGE ───────────────────────────────────────────────────────────────
    'hip_hinge_wall':       'glute_bridge',
    'glute_bridge':         'glute_bridge_march',
    'glute_bridge_march':   'glute_bridge_single',
    'glute_bridge_single':  'hip_thrust_bodyweight',
    'hip_thrust_bodyweight': 'hip_thrust_elevated',
    'hip_thrust_elevated':  None,
    'donkey_kick':          None,
    'fire_hydrant':         None,
    'good_morning':         'sumo_deadlift_bw',
    'sumo_deadlift_bw':     'rdl_single',
    'rdl_single':           None,
    'superman_hold':        None,

    # ── CORE ────────────────────────────────────────────────────────────────
    'pelvic_tilt':          'toe_tap_supine',
    'toe_tap_supine':       'heel_slide',
    'heel_slide':           'dead_bug',
    'dead_bug':             'plank_shoulder_tap',
    'plank_shoulder_tap':   None,
    'plank_knee':           'plank',
    'plank':                'bear_hold',
    'bear_hold':            'mountain_climber',
    'mountain_climber':     None,
    'side_plank_knee':      'side_plank',
    'side_plank':           None,
    'bird_dog':             None,
    'hollow_hold':          None,
    'kegel':                None,

    # ── MOBILITY ────────────────────────────────────────────────────────────
    # Les étirements/mobilité n'ont pas de progression directe
    'cat_cow':              None,
    'childs_pose':          None,
    'hip_flexor_stretch':   None,
    'thoracic_rotation':    None,
    'world_greatest_stretch': None,
    'hip_90_90':            None,
    'ankle_circles':        None,
    'shoulder_rolls':       None,
    'pigeon_pose':          None,
    'inchworm':             None,
    'thread_needle':        None,
    'lizard_pose':          None,
    'couch_stretch':        None,
}


def main():
    pattern = os.path.join(os.path.dirname(__file__), 'web/data/exercises/*.json')
    files   = sorted(glob.glob(pattern))
    total   = 0

    for path in files:
        fname = os.path.basename(path)
        if fname in ('LICENSE', 'image_prompts.txt'):
            continue
        with open(path, encoding='utf-8') as f:
            data = json.load(f)

        for ex in data:
            ex['progression_to'] = CHAINS.get(ex['id'], None)

        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write('\n')

        annotated = sum(1 for ex in data if ex['progression_to'])
        print(f'  {fname:20s} {len(data):3d} ex  ({annotated} avec progression)')
        total += len(data)

    print(f'\n✓ {total} exercices annotés dans {len(files)} fichiers')


if __name__ == '__main__':
    main()
