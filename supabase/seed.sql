-- Seed data (idempotent where it matters). Applied by `supabase db reset`
-- locally; in production run once via the SQL editor (see SETUP.md).

insert into public.gifts (name, icon, cost) values
  ('Gold Star', 'star', 10),
  ('Shaker Bottle', 'cup-soda', 25),
  ('Iron Trophy', 'trophy', 50),
  ('Gold Dumbbell', 'dumbbell', 100),
  ('Champion Belt', 'medal', 200);

insert into public.exercises (name, muscle_group, equipment) values
  -- chest
  ('Barbell Bench Press','chest','barbell'),('Incline Barbell Bench Press','chest','barbell'),
  ('Decline Bench Press','chest','barbell'),('Dumbbell Bench Press','chest','dumbbell'),
  ('Incline Dumbbell Press','chest','dumbbell'),('Dumbbell Fly','chest','dumbbell'),
  ('Cable Fly','chest','cable'),('Machine Chest Press','chest','machine'),('Pec Deck','chest','machine'),
  ('Push-Up','chest','bodyweight'),('Chest Dip','chest','bodyweight'),
  -- back
  ('Deadlift','back','barbell'),('Barbell Row','back','barbell'),('Pendlay Row','back','barbell'),
  ('T-Bar Row','back','barbell'),('One-Arm Dumbbell Row','back','dumbbell'),('Pull-Up','back','bodyweight'),
  ('Chin-Up','back','bodyweight'),('Lat Pulldown','back','cable'),('Seated Cable Row','back','cable'),
  ('Straight-Arm Pulldown','back','cable'),('Chest-Supported Row','back','machine'),('Rack Pull','back','barbell'),
  ('Back Extension','back','bodyweight'),('Face Pull','back','cable'),
  -- shoulders
  ('Overhead Press','shoulders','barbell'),('Seated Dumbbell Press','shoulders','dumbbell'),
  ('Arnold Press','shoulders','dumbbell'),('Lateral Raise','shoulders','dumbbell'),
  ('Cable Lateral Raise','shoulders','cable'),('Rear Delt Fly','shoulders','dumbbell'),
  ('Upright Row','shoulders','barbell'),('Machine Shoulder Press','shoulders','machine'),
  ('Push Press','shoulders','barbell'),('Barbell Shrug','shoulders','barbell'),('Dumbbell Shrug','shoulders','dumbbell'),
  -- arms
  ('Barbell Curl','biceps','barbell'),('EZ-Bar Curl','biceps','barbell'),('Dumbbell Curl','biceps','dumbbell'),
  ('Hammer Curl','biceps','dumbbell'),('Incline Dumbbell Curl','biceps','dumbbell'),('Preacher Curl','biceps','machine'),
  ('Cable Curl','biceps','cable'),('Concentration Curl','biceps','dumbbell'),
  ('Close-Grip Bench Press','triceps','barbell'),('Skull Crusher','triceps','barbell'),
  ('Tricep Pushdown','triceps','cable'),('Overhead Tricep Extension','triceps','cable'),
  ('Dumbbell Overhead Extension','triceps','dumbbell'),('Tricep Dip','triceps','bodyweight'),
  ('Diamond Push-Up','triceps','bodyweight'),('Wrist Curl','forearms','dumbbell'),('Farmer''s Carry','forearms','dumbbell'),
  -- legs
  ('Back Squat','quads','barbell'),('Front Squat','quads','barbell'),('Leg Press','quads','machine'),
  ('Hack Squat','quads','machine'),('Goblet Squat','quads','dumbbell'),('Bulgarian Split Squat','quads','dumbbell'),
  ('Walking Lunge','quads','dumbbell'),('Leg Extension','quads','machine'),('Step-Up','quads','dumbbell'),
  ('Romanian Deadlift','hamstrings','barbell'),('Stiff-Leg Deadlift','hamstrings','barbell'),
  ('Lying Leg Curl','hamstrings','machine'),('Seated Leg Curl','hamstrings','machine'),
  ('Good Morning','hamstrings','barbell'),('Nordic Curl','hamstrings','bodyweight'),
  ('Hip Thrust','glutes','barbell'),('Glute Bridge','glutes','bodyweight'),('Cable Kickback','glutes','cable'),
  ('Sumo Deadlift','glutes','barbell'),('Hip Abduction','glutes','machine'),
  ('Standing Calf Raise','calves','machine'),('Seated Calf Raise','calves','machine'),('Donkey Calf Raise','calves','machine'),
  -- core
  ('Plank','core','bodyweight'),('Hanging Leg Raise','core','bodyweight'),('Cable Crunch','core','cable'),
  ('Ab Wheel Rollout','core','other'),('Russian Twist','core','bodyweight'),('Pallof Press','core','cable'),
  ('Decline Sit-Up','core','bodyweight'),('Dead Bug','core','bodyweight'),
  -- full body / conditioning
  ('Power Clean','full_body','barbell'),('Hang Clean','full_body','barbell'),('Snatch','full_body','barbell'),
  ('Kettlebell Swing','full_body','kettlebell'),('Thruster','full_body','barbell'),('Burpee','full_body','bodyweight'),
  ('Sled Push','full_body','other'),('Rowing Machine','cardio','machine'),('Treadmill Run','cardio','machine'),
  ('Stationary Bike','cardio','machine'),('Stair Climber','cardio','machine'),('Jump Rope','cardio','other');
