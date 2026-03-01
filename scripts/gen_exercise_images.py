#!/usr/bin/env python3
"""
gen_exercise_images.py — Generates exercise illustration images using
Google AI Studio (Imagen 3 via Gemini API) and saves them to web/icons/exercises/.

Usage:
  export GEMINI_API_KEY="your_api_key"
  python3 scripts/gen_exercise_images.py [--dry-run] [--category push]
  python3 scripts/gen_exercise_images.py --ids push_pike,wall_slide   # force specific

Images are saved to: web/icons/exercises/<exercise_id>.png
image_url in JSON:    /icons/exercises/<exercise_id>.png

Requirements:
  pip install google-genai pillow
"""

import argparse
import base64
import json
import os
import sys
import time
from pathlib import Path

EXERCISES_DIR = Path(__file__).parent.parent / "web" / "data" / "exercises"
OUTPUT_DIR    = Path(__file__).parent.parent / "web" / "icons" / "exercises"
URL_PREFIX    = "/icons/exercises"

# ---------------------------------------------------------------------------
# Global style — applied to every prompt
# ---------------------------------------------------------------------------
STYLE_PREFIX = (
    "3-panel horizontal comic strip, minimalist flat illustration. "
    "Bold black outlines, pure white background. "
    "Character: gender-neutral rounded figure — smooth oval head (no face, no hair), "
    "lean athletic build (NOT chubby), simple rounded limbs. "
    "IDENTICAL figure proportions in all 3 panels. "
    "ABSOLUTE RULES: flat colors only — NO gradients, NO shadows, NO motion blur, "
    "NO ghost or transparency effects, NO anatomy cross-sections, NO muscle diagrams, "
    "NO realistic body parts, NO skin-colored elements anywhere. "
    "Color palette: figure body = forest green #2D6A4F, "
    "active/working muscles and highlighted limbs = orange #F4A261, "
    "floor/props/furniture = light gray #CCCCCC. "
    "No text, no numbers, no labels, no annotated arrows anywhere. "
    "Landscape 3:1 ratio. Panels separated by thin black vertical lines. "
    "Show the complete figure in every panel. "
)

STYLE_SUFFIX = (
    "Clean, friendly mobile fitness app illustration. "
)

# ---------------------------------------------------------------------------
# Per-exercise visual hints — complete 3-panel description for every exercise.
# This is the source of truth for image generation. Keyed by exercise ID.
# ---------------------------------------------------------------------------
VISUAL_HINTS = {

    # ══════════════════════════════════════════════════════════════════════
    # PUSH
    # ══════════════════════════════════════════════════════════════════════

    "push_wall": (
        "SIDE VIEW. Props: a flat gray wall on the right side of frame. "
        "[1] Figure stands ~60 cm from wall, palms flat on wall at shoulder height, "
        "body forms a straight diagonal line from heels to head. Arms extended. "
        "[2] Elbows bend ~45°, chest approaches wall — body stays rigid. "
        "Orange on chest and shoulders. "
        "[3] Palms push into wall, arms extend fully, return to diagonal starting line."
    ),
    "push_knee": (
        "SIDE VIEW. "
        "[1] Knees on floor, hands on floor shoulder-width apart. Body forms a straight "
        "diagonal line from knees to head — arms extended. "
        "[2] Elbows bend ~45° outward, chest lowers toward floor. "
        "Orange on chest and triceps. "
        "[3] Push palms into floor, arms extend, return to straight diagonal from knees to head."
    ),
    "push_incline": (
        "SIDE VIEW. Props: a low sturdy table or chair seat on the right of frame. "
        "[1] Hands on table edge at chest height, feet on floor behind. "
        "Body forms a straight diagonal from feet to hands. Head neutral. "
        "[2] Elbows bend ~45°, chest approaches table edge. "
        "Orange on chest and shoulders. "
        "[3] Push hands into table, arms straighten, return to starting diagonal."
    ),
    "push_standard": (
        "SIDE VIEW. "
        "[1] High plank: hands on floor shoulder-width, body perfectly straight from heels to head. Arms extended. "
        "[2] Elbows bend to ~45° (not flared wide, not pinned tight), chest 2 cm from floor. "
        "Orange on chest and triceps. "
        "[3] Push through palms, arms straighten fully, return to plank."
    ),
    "push_wide": (
        "SIDE VIEW. Consistent figure style in all 3 panels — no fingers, no style changes. "
        "[1] High plank with hands placed NOTICEABLY wider than shoulder-width. "
        "[2] Elbows bend and flare outward as chest lowers. "
        "Orange on outer chest (pectorals). "
        "[3] Push floor, arms extend, return to wide plank."
    ),
    "push_diamond": (
        "SIDE VIEW. "
        "[1] High plank, hands close together under chest forming a diamond/triangle shape "
        "(index fingers and thumbs nearly touching). "
        "[2] Elbows bend and track straight back close to ribs, chest lowers. "
        "Orange on triceps (back of arms). "
        "[3] Push through hands, arms extend, return to diamond plank."
    ),
    "push_pike": (
        "SIDE VIEW. The figure is in an inverted-V shape throughout — hips HIGH, like downward dog. "
        "[1] Hands and feet on floor, hips raised high forming a sharp inverted-V. Arms and legs straight. "
        "[2] Elbows bend, head descends toward floor — hips STAY HIGH throughout. "
        "Orange on deltoids and shoulders. "
        "[3] Push palms into floor, elbows straighten, head rises back up. Return to inverted-V."
    ),
    "push_negative": (
        "SIDE VIEW. "
        "[1] Top of push-up: high plank, arms fully extended. "
        "[2] Midway through a very SLOW descent — body halfway down. "
        "3-4 small horizontal motion lines near torso showing slow controlled movement. "
        "Orange on chest. "
        "[3] Chest at floor level (bottom position). The story is: top → slow mid → bottom."
    ),
    "push_close": (
        "SIDE VIEW. "
        "[1] High plank with hands directly under chest, closer than shoulder-width. "
        "[2] Elbows bend and track straight BACK (close to ribs, not flared). "
        "Orange on triceps. "
        "[3] Push floor, arms extend back to start."
    ),
    "push_staggered": (
        "SIDE VIEW. The asymmetric hand placement MUST be clearly visible. "
        "[1] High plank: one hand is ~20 cm further forward than the other. "
        "[2] Elbows bend — the closer-hand elbow bends more. Chest lowers. "
        "Orange on chest of the side with the closer hand. "
        "[3] Push up, return to staggered plank."
    ),
    "push_decline": (
        "SIDE VIEW. Props: a chair or couch on the right, feet resting on it. "
        "[1] Hands on floor shoulder-width, feet elevated on chair. "
        "Body forms a straight declining line from elevated feet down to hands. "
        "[2] Elbows bend ~45°, chest lowers toward floor. "
        "Orange on upper chest and shoulders. "
        "[3] Push through palms, arms extend, return to declined plank."
    ),
    "push_t": (
        "SIDE VIEW shifting to FRONT 3/4 VIEW in panel 3. "
        "[1] High plank, arms extended. "
        "[2] Lower chest toward floor — mid push-up. "
        "[3] Push back up AND rotate entire torso to the right: right arm extends straight up "
        "toward ceiling, left arm supports. Body forms a T shape. "
        "Orange on chest and right shoulder of raised arm."
    ),
    "push_archer": (
        "SIDE VIEW. "
        "[1] High plank with hands placed very far apart (much wider than shoulders). "
        "[2] Shift weight to the right: bend RIGHT elbow (body lowers toward right), "
        "simultaneously extend LEFT arm STRAIGHT TO THE SIDE — horizontal, parallel to floor. "
        "Orange on right chest. The extending arm goes SIDEWAYS not upward. "
        "[3] Push right arm up, return both arms to wide starting position."
    ),

    # ══════════════════════════════════════════════════════════════════════
    # PULL
    # ══════════════════════════════════════════════════════════════════════

    "incline_row_table": (
        "SIDE VIEW. Props: a gray table (wide horizontal rectangle) above the figure. "
        "[1] Figure lies on back UNDER the table at a ~35° incline. "
        "Heels on floor, body straight from heels to shoulders. "
        "Both hands grip the table edge from below, arms FULLY EXTENDED upward toward table. "
        "[2] Pull body up: elbows bend, chest rises toward table underside. "
        "Shoulder blades squeeze together. Orange on upper back (lats, rhomboids). "
        "[3] Lower slowly: arms extend back to start."
    ),
    "incline_row_table_knees": (
        "SIDE VIEW. Props: gray table above. "
        "[1] Figure lies under table with KNEES BENT ~90° and feet flat on floor. "
        "Body more horizontal than the straight-leg version. Hands grip table from below, arms extended. "
        "[2] Pull body up: elbows bend, chest approaches table. "
        "Orange on upper back. "
        "[3] Lower slowly to extended arm start. The bent knees are clearly visible."
    ),
    "door_row": (
        "SIDE VIEW. Consistent figure proportions in all panels — no exaggerated muscles. "
        "Props: a vertical gray post or column on the left of frame. "
        "[1] Standing, both hands gripping post at mid-chest height, knees slightly bent, "
        "body leans back in a straight diagonal (arms extended). "
        "[2] Pull chest toward post: elbows bend, shoulder blades squeeze together. "
        "Orange on upper back. "
        "[3] Extend arms, lean back to starting diagonal."
    ),
    "chair_assisted_row": (
        "SIDE VIEW. Consistent green figure — head is the same dark green oval as body, no skin color. "
        "Props: a chair on the left, figure sits on floor in front of it. "
        "[1] Seated on floor facing chair, legs extended under it, "
        "both hands gripping chair seat, torso slightly reclined. "
        "[2] Pull torso up toward seat: elbows bend, upper back rises. "
        "Orange on upper back. "
        "[3] Lower torso back down to start."
    ),
    "band_pull_apart_towel": (
        "FRONT VIEW. "
        "[1] Standing, both hands hold a rolled orange towel at chest height, "
        "arms extended forward, hands ~30 cm apart. "
        "[2] Pull hands APART horizontally as wide as possible — "
        "arms spread wide, shoulder blades pinch together. "
        "Orange on upper back between shoulder blades. "
        "[3] Return hands together slowly."
    ),
    "prone_cobra": (
        "SIDE VIEW. "
        "[1] Lying face down, arms along sides, palms near hips, body flat on floor. "
        "[2] Head and upper chest lift slightly off floor, arms remain along sides. "
        "Small arrows near shoulder blades pointing inward (blades pinch together). "
        "Orange on upper back between shoulder blades. "
        "[3] Lower back to completely flat position."
    ),
    "reverse_snow_angel": (
        "REAR 3/4 VIEW — camera slightly above and behind the figure, who lies face down. "
        "[1] Lying face down, arms at sides, palms down, arms slightly raised off floor. "
        "[2] Arms sweep upward and outward in a wide arc overhead — like a snow angel. "
        "Arms stay slightly raised off floor throughout. "
        "Orange on upper back and rear deltoids. "
        "[3] Arms return back along sides."
    ),
    "wall_slide": (
        "BACK VIEW — figure faces away from viewer, back against a gray wall. "
        "[1] Both forearms flat against wall in a goal-post shape: "
        "upper arms horizontal, elbows bent 90°. Lower back touches wall. "
        "[2] Slide forearms UPWARD along wall, arms straightening overhead. "
        "Orange on upper back (shoulder blades, trapezius). "
        "[3] Slide back down slowly to 90° goal-post position."
    ),
    "towel_row": (
        "SIDE VIEW. Props: a vertical post on the left with an orange towel looped around it. "
        "[1] Standing, holding both ends of towel, knees slightly bent, "
        "body leans back in a straight diagonal — towel is taut. "
        "[2] Pull chest toward post: elbows bend, shoulder blades squeeze. "
        "Orange on upper back. "
        "[3] Extend arms, lean back to starting diagonal."
    ),
    "scapular_pushup": (
        "SIDE VIEW. "
        "[1] High plank (on hands), arms straight, body rigid — this is the neutral start. "
        "[2] WITHOUT bending elbows, let chest drop between shoulder blades which come TOGETHER. "
        "Orange dots between shoulder blades showing the pinch. "
        "[3] Push floor away: shoulder blades spread APART, upper back rises slightly. "
        "Elbows remain locked straight in all 3 panels."
    ),
    "prone_t_raise": (
        "REAR AERIAL VIEW — camera from slightly above and behind, figure lies face down. "
        "[1] Lying face down, arms extended straight out to the sides at shoulder height "
        "forming a T shape, thumbs pointing up. Arms at floor level. "
        "[2] Lift both arms several cm off floor by squeezing shoulder blades together. "
        "Orange on upper back between shoulder blades. "
        "[3] Lower arms slowly back to floor-level T position."
    ),
    "prone_y_raise": (
        "REAR AERIAL VIEW — camera from slightly above and behind, figure lies face down. "
        "[1] Lying face down, arms extended DIAGONALLY overhead forming a Y shape, thumbs up. Arms at floor level. "
        "[2] Lift both arms several cm off floor: effort comes from mid/lower back contracting. "
        "Orange on lower-mid back (lower trapezius). "
        "No shoulder shrug visible — neck stays long. "
        "[3] Lower arms slowly back to floor-level Y position."
    ),
    "table_row_single_arm": (
        "SIDE VIEW. Props: gray table above. "
        "[1] Under table at an incline, ONE hand grips table edge — the other arm lies flat along body. "
        "Body in straight inclined plank. "
        "[2] Pull with the ONE arm: chest rises, elbow bends, slight torso rotation toward pulling side. "
        "Orange on pulling-side back. "
        "[3] Lower slowly, arm extends. Working arm clearly distinguished from the resting arm."
    ),

    # ══════════════════════════════════════════════════════════════════════
    # SQUAT
    # ══════════════════════════════════════════════════════════════════════

    "squat_bodyweight": (
        "SIDE VIEW only — no front view at any point. Lean athletic figure. "
        "[1] Standing side profile: feet shoulder-width, slight toe-out, arms relaxed in front. "
        "[2] Squat: knees track forward over toes, hips drop below knee level, "
        "torso leans slightly forward, back straight. "
        "Orange on quads (front thigh) and glutes (rear). "
        "[3] Drive through heels, stand fully upright."
    ),
    "squat_sumo": (
        "FRONT 3/4 VIEW. "
        "[1] Wide stance — noticeably wider than shoulders, toes pointed out ~45°. Arms crossed or forward. "
        "[2] Squat: knees track outward over toes, torso stays upright, hips below knees. "
        "Orange on inner thighs (adductors) and glutes. "
        "[3] Drive through floor, stand back up. Wide stance maintained throughout."
    ),
    "squat_pulse": (
        "SIDE VIEW. All 3 panels show the figure in a HALF-SQUAT position — never standing, never fully down. "
        "[1] Half-squat: knees bent ~90°, hips at mid-height, arms forward. "
        "[2] Pulse SLIGHTLY UP (5-10 cm range). Small upward arrow near knees. Orange on quads. "
        "[3] Pulse back DOWN. Small downward arrow near knees. "
        "NO glowing effects, NO color outside body outline."
    ),
    "lunge_forward": (
        "SIDE VIEW in all 3 panels — no front-facing views at any point. "
        "[1] Standing upright, feet together, side profile. "
        "[2] Step one foot far FORWARD: front knee bent ~90° over toes, "
        "back knee drops toward floor. Torso upright. "
        "Orange on front quad and front glute. "
        "[3] Push off front foot, return to standing side profile with feet together."
    ),
    "lunge_reverse": (
        "SIDE VIEW. "
        "[1] Standing upright, feet together, side profile. "
        "[2] Step one foot far BACKWARD: back knee drops toward floor, "
        "front knee bent ~90° over front foot. Torso upright. "
        "Orange on front quad and front glute. "
        "[3] Push through front foot, return to standing side profile with feet together."
    ),
    "lunge_lateral": (
        "FRONT VIEW. "
        "[1] Standing, feet hip-width, arms in front for balance. "
        "[2] Step far to the RIGHT: right knee bends deeply, "
        "left leg stays completely STRAIGHT with foot flat. "
        "Orange on right inner thigh (adductor) and right quad. "
        "[3] Push off right foot, return to standing center with feet together."
    ),
    "split_squat": (
        "SIDE VIEW. Props: a couch or chair on the right of frame. "
        "[1] Right foot elevated on couch seat behind, left foot on floor in front. "
        "Body upright, both legs relatively straight. "
        "[2] Lower: left front knee bends toward floor, right rear knee drops down. "
        "Orange on left quad and left glute. "
        "[3] Drive through left heel to stand — feet maintain their split positions."
    ),
    "squat_jump": (
        "SIDE VIEW. "
        "[1] Quarter-squat loading position: hips back, knees bent, arms back. "
        "[2] Figure is AIRBORNE: feet off floor, body more vertical, legs extending. "
        "Orange on quads and calves. "
        "[3] SOFT LANDING: both feet on floor, knees bent ~90° absorbing impact. "
        "Small arrows near feet pointing downward for soft landing. Knees NOT caving inward."
    ),
    "wall_sit": (
        "SIDE VIEW. Props: a flat gray wall on the left of frame. "
        "[1] Standing against wall, back flat against it. "
        "[2] Mid-slide: knees starting to bend, back sliding down wall. "
        "[3] Full wall sit: back flat against wall, thighs PARALLEL to floor, knees at 90°. "
        "Orange on quads. Held static position clearly shown."
    ),
    "step_up": (
        "SIDE VIEW. Props: a step or sturdy chair on the left of frame. "
        "[1] Standing in front of step, right foot placed on top of step, left on floor. "
        "[2] Drive through right heel: body lifts, left foot leaves floor. "
        "Orange on right quad and right glute. "
        "[3] Left foot placed on step (standing on step), then controlled step back down."
    ),
    "curtsy_lunge": (
        "REAR 3/4 VIEW — from slightly behind and to one side. "
        "[1] Standing, feet hip-width, side toward viewer. "
        "[2] Right foot crosses BEHIND and to the left of left foot (curtsy), "
        "both knees bend — front left knee stays over toes. "
        "Orange on outer left glute. "
        "[3] Push through front foot, return to standing."
    ),
    "squat_tempo": (
        "SIDE VIEW. ONE figure per panel — no ghost effects, no double figures, no motion blur. "
        "[1] Standing, side profile. "
        "[2] MID-DESCENT (body at half-squat): 3-4 small wavy horizontal lines beside legs "
        "suggesting slow controlled motion. Orange on quads. "
        "[3] Full bottom position: hips below knees, brief pause. Single clean figure."
    ),
    "pistol_squat_assisted": (
        "SIDE VIEW. Props: a doorframe or wall on the left (figure holds it lightly). "
        "[1] Standing on LEFT foot, right leg extended straight FORWARD, "
        "left hand resting on doorframe for support. "
        "[2] Lower on left leg: deep squat, right leg stays extended forward horizontal. "
        "Orange on left quad and left glute. "
        "[3] Drive through left heel, return to standing on one leg — right leg still extended."
    ),
    "heel_elevated_squat": (
        "SIDE VIEW. Props: a small gray book or rolled towel under the heels. "
        "[1] Standing with heels elevated ~5 cm, feet shoulder-width, slight toe-out. "
        "[2] Deep squat: torso stays more upright than standard squat, knees track over toes. "
        "Orange on quads (front thigh emphasis due to heel elevation). "
        "[3] Drive up to standing, heels remain on book."
    ),
    "squat_cossack": (
        "FRONT 3/4 VIEW. "
        "[1] Very wide stance (wider than sumo), toes turned out, hands clasped in front. "
        "[2] Shift weight far to the RIGHT: right knee bends deeply, hips sink right, "
        "left leg stays completely STRAIGHT with foot flat. "
        "Orange on right inner thigh and right glute. "
        "[3] Return to wide center stance (legs straight, weight centered)."
    ),

    # ══════════════════════════════════════════════════════════════════════
    # HINGE
    # ══════════════════════════════════════════════════════════════════════

    "glute_bridge": (
        "SIDE VIEW. "
        "[1] Lying on back, knees bent ~90°, feet flat on floor, arms at sides. "
        "[2] Hips lift: body forms a straight line from knees to shoulders. "
        "Glutes visibly contracted. Orange on glutes. "
        "[3] Slowly lower hips back to floor."
    ),
    "glute_bridge_single": (
        "SIDE VIEW. "
        "[1] Lying on back, left knee bent (foot on floor), "
        "right leg extended and held HORIZONTAL — parallel to the floor, at hip height. NOT raised high. "
        "[2] Lift hips: body forms line from left knee to shoulders. Right leg stays horizontal. "
        "Orange on left glute. "
        "[3] Lower hips slowly. Right leg remains horizontal throughout all panels."
    ),
    "donkey_kick": (
        "SIDE VIEW. "
        "[1] On all fours, neutral back. "
        "[2] Right knee lifts: leg stays bent at 90°, sole of right foot drives toward ceiling. "
        "Orange on right glute. "
        "[3] Lower right leg back to floor, return to all-fours."
    ),
    "fire_hydrant": (
        "REAR 3/4 VIEW — from behind and slightly above to show the lateral leg lift. "
        "[1] On all fours, neutral back. "
        "[2] Right knee lifts OUT TO THE SIDE (like a dog at a hydrant), "
        "knee stays bent ~90°, foot stays near glute level. "
        "Orange on right outer glute. "
        "[3] Lower right knee back to floor."
    ),
    "good_morning": (
        "SIDE VIEW. "
        "[1] Standing, hands interlaced behind head, feet hip-width, slight knee bend. "
        "[2] Hinge at hips: push hips backward, torso tips forward — "
        "back stays PERFECTLY FLAT. Torso reaches near-horizontal. "
        "Orange on hamstrings (back of thighs). "
        "[3] Squeeze hamstrings and glutes to drive hips forward, return upright."
    ),
    "rdl_single": (
        "SIDE VIEW. "
        "[1] Standing on RIGHT leg, slight knee bend in right leg, "
        "left foot barely off floor. "
        "[2] Hinge forward: torso tips forward, left leg extends BEHIND — "
        "body forms a T-shape parallel to floor. Back flat. "
        "Orange on right hamstring. "
        "[3] Squeeze right glute, pull left leg under body, return to standing on right leg."
    ),
    "hip_thrust_bodyweight": (
        "SIDE VIEW. Props: a couch or low surface on the left — figure's upper back rests against it. "
        "[1] Upper back against couch, knees bent ~90°, feet flat on floor, hips LOW near floor. "
        "[2] Drive hips UP powerfully: body forms a straight line from knees to shoulders. "
        "Orange on glutes. "
        "[3] Lower hips slowly back toward floor. No anatomy diagrams."
    ),
    "hip_hinge_wall": (
        "SIDE VIEW. Props: flat gray wall on the left, figure stands very close to it. "
        "[1] Standing ~15 cm from wall, back toward wall, feet hip-width. "
        "[2] Push hips BACK to touch wall: knees soft, back stays FLAT, "
        "torso hinges forward. Orange on hamstrings. "
        "[3] Contract glutes, drive hips forward to stand tall again."
    ),
    "glute_bridge_march": (
        "SIDE VIEW. "
        "[1] Raised glute bridge: hips elevated, body forms a straight line from knees to shoulders. "
        "[2] While holding hips LEVEL: lift left knee toward chest. "
        "Orange on left hip flexor and core. Hips do NOT drop. "
        "[3] Lower left foot, lift right knee (alternating). Hips stay level throughout."
    ),
    "superman_hold": (
        "SIDE VIEW. Figure stays ON THE FLOOR at all times — does NOT levitate. "
        "[1] Lying face down, arms extended overhead, body flat. "
        "[2] Simultaneously lift arms AND legs a few cm off floor — "
        "body forms a gentle arc (banana shape, concave upward). "
        "Orange on lower back and glutes. "
        "[3] Lower everything back to flat position."
    ),
    "hip_thrust_elevated": (
        "SIDE VIEW. Props: a chair or higher bench on the left — figure's upper BACK rests on it "
        "(higher than the bodyweight hip thrust setup). "
        "[1] Upper back on chair, feet flat on floor, knees ~90°, hips LOW near floor. "
        "[2] Drive hips UP powerfully: straight line from knees to shoulders. "
        "Orange on glutes. "
        "[3] Lower hips back toward floor. Movement is purely UP and DOWN."
    ),
    "sumo_deadlift_bw": (
        "FRONT 3/4 VIEW. "
        "[1] Very wide stance, toes pointed out, hands clasped between legs in front. "
        "[2] Hinge: hips push back, chest tips forward, back FLAT — "
        "hands reach toward floor between feet. "
        "Orange on inner thighs and glutes. "
        "[3] Drive through floor: stand fully upright, glutes squeezed. "
        "Wide stance maintained in all panels."
    ),
    "frog_pump": (
        "SIDE VIEW. "
        "[1] Lying on back, feet brought together close to glutes, "
        "knees dropped OUTWARD (frog position). Soles of feet touching. "
        "[2] Press feet together and drive hips UP: glutes squeeze. "
        "Orange on glutes. "
        "[3] Lower hips slowly. Frog-position knees stay open throughout."
    ),

    # ══════════════════════════════════════════════════════════════════════
    # CORE
    # ══════════════════════════════════════════════════════════════════════

    "plank_knee": (
        "SIDE VIEW. "
        "[1] FOREARMS on floor (elbow plank), KNEES on floor, "
        "body in straight line from knees to shoulders. This is NOT a push-up. "
        "[2] Same position held, orange on core (abs area). "
        "[3] Same position showing full body alignment from knees to shoulders."
    ),
    "plank": (
        "SIDE VIEW. "
        "[1] ELBOW plank: forearms on floor, toes on floor, "
        "body in perfectly straight line from heels to shoulders. "
        "[2] Same position held. Orange on core (abs). Flat color only — no anatomy diagrams. "
        "[3] Same position with small arrow near hips suggesting neutral alignment (no sag, no pike)."
    ),
    "side_plank": (
        "SIDE VIEW. "
        "[1] Side-lying on RIGHT forearm, right hip on floor, body straight. "
        "[2] Lift RIGHT hip: body forms a straight diagonal line from feet to shoulder. "
        "Orange on obliques (stripe along side of torso). "
        "[3] Same raised position held clearly. Do NOT show arm raised overhead variation."
    ),
    "dead_bug": (
        "SIDE VIEW. "
        "[1] Lying on back, BOTH arms pointing straight up to ceiling, "
        "BOTH legs at 90° (thighs vertical, shins horizontal). "
        "[2] Simultaneously lower RIGHT arm overhead toward floor "
        "AND extend LEFT leg out to near-floor. "
        "Orange on core (abs). Lower back PRESSED into floor. "
        "[3] Return right arm and left leg to start position."
    ),
    "bird_dog": (
        "SIDE VIEW. "
        "[1] On all fours, neutral spine, wrists under shoulders, knees under hips. "
        "[2] SIMULTANEOUSLY: RIGHT arm extends straight FORWARD, "
        "LEFT leg extends straight BACK — both opposite limbs visible at the same time. "
        "Orange on extended right arm and left leg. "
        "[3] Return right arm and left leg to all-fours."
    ),
    "hollow_hold": (
        "SIDE VIEW. "
        "[1] Lying flat on back, arms at sides, legs flat. "
        "[2] STATIC HOLD: arms extend overhead close to ears, "
        "both legs raised to ~30-45°, lower back PRESSED into floor. "
        "This is a HELD DISH position, not a crunch. Orange on abs. "
        "[3] Slowly lower arms and legs back to flat position."
    ),
    "mountain_climber": (
        "SIDE VIEW. "
        "[1] High plank (on hands), body in straight line. "
        "[2] RIGHT knee drives forward toward chest — left leg stays extended. "
        "Orange on core and right hip flexor. Hips stay LOW. "
        "[3] Right foot returns, LEFT knee drives forward. Continuous alternating shown."
    ),
    "kegel": (
        "SIDE VIEW. "
        "[1] Lying on back, KNEES BENT, feet flat on floor. Body relaxed. "
        "[2] Subtle orange ring/glow at pelvic area (lower pelvis) showing activation. "
        "Body otherwise relaxed. "
        "[3] Same position, orange fades — showing release. "
        "Simple and dignified. No anatomical detail."
    ),
    "pelvic_tilt": (
        "SIDE VIEW, close attention to spinal curve. "
        "[1] Lying on back, knees bent, small natural arch at lower back (neutral). "
        "[2] Press lower back FLAT into floor — the arch disappears. "
        "Small arrows showing lower spine pressing down. Orange on lower abs. "
        "[3] Release — small arch at lower back returns. "
        "Subtle but clear spinal position change between panels."
    ),
    "side_plank_knee": (
        "SIDE VIEW. "
        "[1] Side-lying on RIGHT forearm, KNEES BENT — figure is already in side-lying position "
        "(NOT lying flat on back). Right hip on floor. "
        "[2] Lift RIGHT hip: body forms straight line from KNEES to shoulder. "
        "Orange on obliques. "
        "[3] Same raised position held."
    ),
    "heel_slide": (
        "SIDE VIEW. "
        "[1] Lying on back, BOTH knees bent, feet flat on floor. "
        "Lower back pressed into floor. "
        "[2] Slowly slide LEFT heel along floor, extending leg. "
        "Orange on lower abs (maintaining back pressure). "
        "[3] Slide left heel back (bend knee again). Lower back stays pressed throughout."
    ),
    "toe_tap_supine": (
        "SIDE VIEW. "
        "[1] Lying on back, BOTH legs at 90°: thighs vertical, shins horizontal (tabletop). "
        "[2] Slowly lower RIGHT foot to TAP the floor — knee stays bent at 90°. "
        "Orange on lower abs. Lower back pressed into floor. "
        "[3] Raise right foot back to tabletop, switch — left foot starts to lower."
    ),
    "bear_hold": (
        "SIDE VIEW. "
        "[1] On all fours: hands under shoulders, knees under hips, back flat. "
        "[2] Lift knees JUST 2-3 cm off floor (barely hovering). "
        "Back remains flat, core braced. "
        "Small gap visible between knees and floor. Orange on core. "
        "[3] Same hover position from slightly different angle. Very subtle movement."
    ),
    "plank_shoulder_tap": (
        "SIDE VIEW / slight front 3/4. "
        "[1] High plank (on hands), body straight, feet hip-width. "
        "[2] RIGHT hand lifts off floor and taps LEFT shoulder. "
        "Body stays level — no rotation of hips. Orange on core. "
        "[3] Right hand returns to floor. Left hand lifts to tap right shoulder."
    ),
    "plank_walkout": (
        "SIDE VIEW. "
        "[1] Standing, hinges forward: hands touch floor (knees may soften slightly). "
        "[2] Walk hands forward step by step — arriving in full high plank: "
        "arms extended, body straight. Orange on core and shoulders. "
        "[3] Walk hands back toward feet step by step, roll body up to standing."
    ),

    # ══════════════════════════════════════════════════════════════════════
    # MOBILITY
    # ══════════════════════════════════════════════════════════════════════

    "cat_cow": (
        "SIDE VIEW. "
        "[1] On all fours, back FLAT (neutral spine). "
        "[2] CAT: round back upward — head drops, tailbone tucks, spine arches like an angry cat. "
        "Orange on upper and mid spine (arched upward). "
        "[3] COW: arch back downward — head lifts, tailbone rises, belly sinks. "
        "Orange on lower back (gentle hollow arch)."
    ),
    "childs_pose": (
        "SIDE VIEW. "
        "[1] Kneeling upright, sitting on heels. "
        "[2] Fold forward: arms extend in front on floor, forehead approaches floor, "
        "hips stay near heels. Orange on lower back (lengthening). "
        "[3] Deepest position: forehead rests on floor, arms fully extended, "
        "hips sinking toward heels."
    ),
    "hip_flexor_stretch": (
        "SIDE VIEW. "
        "[1] Half-kneeling: right knee on floor, left foot forward, left knee ~90°. Torso upright. "
        "[2] Press hips gently FORWARD: right hip extends, stretch felt at front of right hip. "
        "Orange on front of right hip (hip flexor). "
        "[3] Deepen: torso upright, arms raised slightly, hip pushed further forward."
    ),
    "thoracic_rotation": (
        "SIDE VIEW. ONE clear figure per panel — no ghost effects. "
        "[1] Kneeling tall, right hand behind head, left arm relaxed at side. "
        "[2] ROTATE: right elbow drives upward and to the right, "
        "chest opens and turns right. Orange on thoracic spine (upper back). "
        "[3] Return center, switch: left hand behind head, left elbow drives left and up."
    ),
    "world_greatest_stretch": (
        "SIDE VIEW. "
        "[1] Lunge: right foot forward, left knee on floor. "
        "Both hands on floor INSIDE right foot. "
        "[2] Rotate: right arm sweeps UP toward ceiling — chest opens, face looks up. "
        "Orange on upper back and right hip. "
        "[3] Lower right arm to floor inside right foot — hip opener deepens."
    ),
    "hip_90_90": (
        "SIDE 3/4 VIEW. "
        "[1] Seated on floor: right shin in front parallel to body (knee bent 90°), "
        "left shin out to the left also bent 90°. Both hips at 90°. Torso upright. "
        "[2] Sit tall: single upward posture arrow. Orange on outer hip. "
        "[3] Lean torso gently forward over right shin. "
        "Minimal arrows — one clean cue per panel."
    ),
    "ankle_circles": (
        "SIDE VIEW. "
        "[1] Seated on chair or floor, right foot raised, ankle supported at shin. "
        "[2] Draw a clockwise circle with the foot — orange arc showing circular rotation path. "
        "[3] Draw a counter-clockwise circle — orange arc in reverse direction."
    ),
    "shoulder_rolls": (
        "FRONT VIEW — figure faces viewer. "
        "[1] Standing, shoulders relaxed and down. Small orange forward arrow on one shoulder "
        "suggesting start of roll. "
        "[2] Both shoulders rolled BACKWARD and UP — elevated near ears. "
        "Orange on shoulder region. "
        "[3] Shoulders rolled DOWN and FORWARD, completing the full circle."
    ),
    "pigeon_pose": (
        "SIDE VIEW. "
        "[1] High plank position (on hands and toes). "
        "[2] Right knee brought forward between hands, right shin diagonal, "
        "left leg extended behind. Hands on floor, upper body upright. "
        "Orange on outer right glute. "
        "[3] Fold torso FORWARD over right shin, forearms on floor. Deep hip stretch."
    ),
    "inchworm": (
        "SIDE VIEW. "
        "[1] Standing, fold forward: palms flat on floor (knees may soften slightly). "
        "[2] Walk hands forward step by step — arrive in full high plank. "
        "Orange on shoulders and core. "
        "[3] Walk hands BACK toward feet step by step, roll body up to standing."
    ),
    "thread_needle": (
        "SIDE 3/4 VIEW. "
        "[1] On all fours, neutral back. "
        "[2] Right arm threads UNDER the body toward the left side — "
        "right shoulder and cheek lowering toward floor. "
        "Orange on right shoulder and upper back. "
        "[3] Right arm fully extended through, right shoulder and cheek resting on floor, "
        "body gently twisted. Deep thoracic stretch."
    ),
    "lizard_pose": (
        "SIDE VIEW. "
        "[1] High lunge: right foot forward, left knee on floor, "
        "both hands on floor inside right foot. "
        "[2] Move hands to inside of right foot, right foot slightly outward. "
        "Orange on front of left hip (hip flexor). "
        "[3] Lower FOREARMS to floor — hips sink deeper. "
        "Body stays diagonal. NOT flat on belly."
    ),
    "couch_stretch": (
        "SIDE VIEW. Props: couch on the left of frame. "
        "[1] Left knee on floor against couch base, left foot folded back against couch cushion, "
        "right foot flat on floor in front. Torso upright. "
        "[2] Same position, gentle forward hip press. "
        "Small orange arrow at front of left hip/thigh showing stretch. "
        "[3] Deepen: hips sink lower, torso stays upright. "
        "Orange on front of left thigh. Figure does NOT walk away from couch."
    ),
    "downward_dog": (
        "SIDE VIEW. "
        "[1] On all fours, hands and knees. "
        "[2] Press floor: hips rise toward ceiling, body forms an inverted-V. "
        "Arms straight, legs straight (or knees slightly bent). "
        "Heels pressing toward floor. Head between arms. "
        "Orange on hamstrings and calves. "
        "[3] Same inverted-V, gently alternating bending/straightening one knee then the other."
    ),
    "standing_quad_stretch": (
        "SIDE VIEW. Props: optional hand on wall on the left for balance. "
        "[1] Standing on left foot, right knee starting to bend, right foot rising. "
        "[2] Right foot pulled toward right glute, right hand gripping right ankle. "
        "Knees aligned, torso upright. Orange on front of right thigh (quad). "
        "[3] Deeper stretch: right heel close to glute, balance maintained."
    ),
}


def make_prompt(ex):
    name    = ex.get("name_en") or ex.get("name_fr", ex["id"])
    cat     = ex.get("category", "")
    pattern = ex.get("movement_pattern", "")
    hint    = VISUAL_HINTS.get(ex["id"], "")
    # Fallback to instructions if no hint (should not happen for known exercises)
    if not hint:
        instr = ex.get("instructions_en") or ex.get("instructions_fr", "")
        hint = f"SIDE VIEW. Movement: {instr}"
    return (
        f"{STYLE_PREFIX}"
        f"Exercise: {name} ({cat} / {pattern}). "
        f"{hint} "
        f"{STYLE_SUFFIX}"
    )


# Safety: never overwrite existing images unless --force or --ids
# Rate limit: ~2 req/s for free tier
RATE_LIMIT_DELAY = 0.6  # seconds between API calls


def load_all_exercises(category_filter=None):
    exercises = []
    for path in sorted(EXERCISES_DIR.glob("*.json")):
        cat = path.stem
        if category_filter and cat != category_filter:
            continue
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        for ex in data:
            ex["_source_file"] = str(path)
            ex["_category"] = cat
        exercises.extend(data)
    return exercises


def save_exercises_by_file(exercises):
    """Write exercises back to their source files, preserving order."""
    by_file = {}
    for ex in exercises:
        src = ex.pop("_source_file", None)
        ex.pop("_category", None)
        if src:
            by_file.setdefault(src, []).append(ex)

    for path, exs in by_file.items():
        with open(path, "w", encoding="utf-8") as f:
            json.dump(exs, f, ensure_ascii=False, indent=2)
        print(f"  Saved {path}")


def generate_image_gemini(api_key, prompt):
    """
    Generate image using Nano Banana Pro via generateContent.
    Returns raw PNG bytes or raises on failure.
    """
    try:
        from google import genai
        from google.genai import types
    except ImportError:
        print("ERROR: Install google-genai: pip install google-genai", file=sys.stderr)
        sys.exit(1)

    client = genai.Client(api_key=api_key)

    response = client.models.generate_content(
        model="nano-banana-pro-preview",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_modalities=["IMAGE", "TEXT"],
        ),
    )

    for part in response.candidates[0].content.parts:
        if part.inline_data and part.inline_data.data:
            data = part.inline_data.data
            return base64.b64decode(data) if isinstance(data, str) else data

    raise RuntimeError("No image part returned by API")


def main():
    parser = argparse.ArgumentParser(description="Generate exercise images via Gemini Imagen")
    parser.add_argument("--dry-run", action="store_true", help="Print prompts without calling API")
    parser.add_argument("--category", help="Only process one category (e.g. push)")
    parser.add_argument("--force", action="store_true", help="Overwrite all existing images")
    parser.add_argument(
        "--ids",
        help="Comma-separated exercise IDs to force-regenerate (e.g. push_pike,wall_slide)",
    )
    args = parser.parse_args()

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key and not args.dry_run:
        print("ERROR: Set GEMINI_API_KEY environment variable.", file=sys.stderr)
        sys.exit(1)

    force_ids = set(args.ids.split(",")) if args.ids else set()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    exercises = load_all_exercises(category_filter=args.category)
    print(f"Loaded {len(exercises)} exercises.", file=sys.stderr)

    generated = 0
    skipped   = 0
    errors    = 0

    for ex in exercises:
        ex_id    = ex["id"]
        name_en  = ex.get("name_en", ex_id)
        out_path = OUTPUT_DIR / f"{ex_id}.png"
        url      = f"{URL_PREFIX}/{ex_id}.png"

        is_forced = args.force or ex_id in force_ids

        # Skip if already has an image and not forcing
        if ex.get("image_url") and not is_forced:
            skipped += 1
            continue

        # Skip if file already exists and not forcing
        if out_path.exists() and not is_forced:
            ex["image_url"] = url
            skipped += 1
            continue

        prompt = make_prompt(ex)
        print(f"[{ex['_category']}] {name_en}")

        if args.dry_run:
            print(f"  PROMPT: {prompt}\n")
            ex["image_url"] = url  # simulate
            generated += 1
            continue

        try:
            img_bytes = generate_image_gemini(api_key, prompt)
            out_path.write_bytes(img_bytes)
            ex["image_url"] = url
            generated += 1
            print(f"  → saved {out_path.name} ({len(img_bytes)//1024} KB)")
            time.sleep(RATE_LIMIT_DELAY)
        except Exception as e:
            print(f"  ERROR: {e}", file=sys.stderr)
            errors += 1
            time.sleep(RATE_LIMIT_DELAY * 2)

    print(f"\nGenerated: {generated}, Skipped: {skipped}, Errors: {errors}")

    if not args.dry_run and generated > 0:
        print("Updating JSON files...")
        save_exercises_by_file(exercises)
        print("Done. Remember to bump CACHE_VERSION in service-worker.js!")
    else:
        # Still need to pop the internal fields even in dry-run
        for ex in exercises:
            ex.pop("_source_file", None)
            ex.pop("_category", None)


if __name__ == "__main__":
    main()
