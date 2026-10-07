
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "ai_usage": {
                  Row: {
                    "calls": number,"day": string,"food_calls": number,"tokens": number,"user_id": string
                  }
                  Insert: {
                    "calls"?: number,"day"?: string,"food_calls"?: number,"tokens"?: number,"user_id": string
                  }
                  Update: {
                    "calls"?: number,"day"?: string,"food_calls"?: number,"tokens"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ai_usage_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ai_usage_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"exercises": {
                  Row: {
                    "created_by": string | null,"equipment": string | null,"id": string,"is_custom": boolean,"muscle_group": string,"name": string
                  }
                  Insert: {
                    "created_by"?: string | null,"equipment"?: string | null,"id"?: string,"is_custom"?: boolean,"muscle_group": string,"name": string
                  }
                  Update: {
                    "created_by"?: string | null,"equipment"?: string | null,"id"?: string,"is_custom"?: boolean,"muscle_group"?: string,"name"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "exercises_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "exercises_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"foods": {
                  Row: {
                    "calories": number,"carbs_g": number,"created_by": string | null,"fat_g": number,"id": string,"name": string,"protein_g": number,"serving_size": string
                  }
                  Insert: {
                    "calories": number,"carbs_g"?: number,"created_by"?: string | null,"fat_g"?: number,"id"?: string,"name": string,"protein_g"?: number,"serving_size": string
                  }
                  Update: {
                    "calories"?: number,"carbs_g"?: number,"created_by"?: string | null,"fat_g"?: number,"id"?: string,"name"?: string,"protein_g"?: number,"serving_size"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "foods_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "foods_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"gifts": {
                  Row: {
                    "cost": number,"icon": string,"id": string,"name": string
                  }
                  Insert: {
                    "cost": number,"icon": string,"id"?: string,"name": string
                  }
                  Update: {
                    "cost"?: number,"icon"?: string,"id"?: string,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"media": {
                  Row: {
                    "caption": string | null,"created_at": string,"duration_seconds": number | null,"id": string,"is_checkin": boolean,"storage_path": string,"type": string,"user_id": string,"workout_id": string | null
                  }
                  Insert: {
                    "caption"?: string | null,"created_at"?: string,"duration_seconds"?: number | null,"id"?: string,"is_checkin"?: boolean,"storage_path": string,"type": string,"user_id": string,"workout_id"?: string | null
                  }
                  Update: {
                    "caption"?: string | null,"created_at"?: string,"duration_seconds"?: number | null,"id"?: string,"is_checkin"?: boolean,"storage_path"?: string,"type"?: string,"user_id"?: string,"workout_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "media_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "media_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "media_workout_id_fkey"
      columns: ["workout_id"]
isOneToOne: false
      referencedRelation: "workouts"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "created_at": string,"id": string,"payload": NonNullable<Json>,"read": boolean,"type": string,"user_id": string
                  }
                  Insert: {
                    "created_at"?: string,"id"?: string,"payload"?: NonNullable<Json>,"read"?: boolean,"type": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"payload"?: NonNullable<Json>,"read"?: boolean,"type"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"nutrition_logs": {
                  Row: {
                    "calories": number,"carbs_g": number,"created_at": string,"fat_g": number,"food_id": string | null,"food_name": string,"id": string,"logged_at": string,"meal_type": string,"protein_g": number,"serving_size": string | null,"updated_at": string,"user_id": string
                  }
                  Insert: {
                    "calories": number,"carbs_g"?: number,"created_at"?: string,"fat_g"?: number,"food_id"?: string | null,"food_name": string,"id"?: string,"logged_at"?: string,"meal_type": string,"protein_g"?: number,"serving_size"?: string | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "calories"?: number,"carbs_g"?: number,"created_at"?: string,"fat_g"?: number,"food_id"?: string | null,"food_name"?: string,"id"?: string,"logged_at"?: string,"meal_type"?: string,"protein_g"?: number,"serving_size"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "nutrition_logs_food_id_fkey"
      columns: ["food_id"]
isOneToOne: false
      referencedRelation: "foods"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "nutrition_logs_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "nutrition_logs_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"partnerships": {
                  Row: {
                    "accepted_at": string | null,"created_at": string,"ended_at": string | null,"id": string,"invite_goal_days": number,"invite_stake": string,"started_week": string | null,"status": string,"streak": number,"timezone": string,"user_a": string,"user_b": string
                  }
                  Insert: {
                    "accepted_at"?: string | null,"created_at"?: string,"ended_at"?: string | null,"id"?: string,"invite_goal_days": number,"invite_stake": string,"started_week"?: string | null,"status"?: string,"streak"?: number,"timezone": string,"user_a": string,"user_b": string
                  }
                  Update: {
                    "accepted_at"?: string | null,"created_at"?: string,"ended_at"?: string | null,"id"?: string,"invite_goal_days"?: number,"invite_stake"?: string,"started_week"?: string | null,"status"?: string,"streak"?: number,"timezone"?: string,"user_a"?: string,"user_b"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "partnerships_user_a_fkey"
      columns: ["user_a"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "partnerships_user_a_fkey"
      columns: ["user_a"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "partnerships_user_b_fkey"
      columns: ["user_b"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "partnerships_user_b_fkey"
      columns: ["user_b"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"points_ledger": {
                  Row: {
                    "created_at": string,"delta": number,"id": string,"reason": string,"ref_id": string | null,"user_id": string
                  }
                  Insert: {
                    "created_at"?: string,"delta": number,"id"?: string,"reason": string,"ref_id"?: string | null,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"delta"?: number,"id"?: string,"reason"?: string,"ref_id"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "points_ledger_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "points_ledger_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "activity_level": string | null,"avatar_url": string | null,"birth_year": number | null,"carbs_g_goal": number | null,"created_at": string,"fat_g_goal": number | null,"goal": string | null,"handle": string | null,"height_cm": number | null,"id": string,"kcal_goal": number | null,"name": string | null,"nutrition_enabled": boolean,"onboarded": boolean,"points": number,"protein_g_goal": number | null,"sex": string | null,"survey": Json | null,"updated_at": string,"weight_kg": number | null
                  }
                  Insert: {
                    "activity_level"?: string | null,"avatar_url"?: string | null,"birth_year"?: number | null,"carbs_g_goal"?: number | null,"created_at"?: string,"fat_g_goal"?: number | null,"goal"?: string | null,"handle"?: string | null,"height_cm"?: number | null,"id": string,"kcal_goal"?: number | null,"name"?: string | null,"nutrition_enabled"?: boolean,"onboarded"?: boolean,"points"?: number,"protein_g_goal"?: number | null,"sex"?: string | null,"survey"?: Json | null,"updated_at"?: string,"weight_kg"?: number | null
                  }
                  Update: {
                    "activity_level"?: string | null,"avatar_url"?: string | null,"birth_year"?: number | null,"carbs_g_goal"?: number | null,"created_at"?: string,"fat_g_goal"?: number | null,"goal"?: string | null,"handle"?: string | null,"height_cm"?: number | null,"id"?: string,"kcal_goal"?: number | null,"name"?: string | null,"nutrition_enabled"?: boolean,"onboarded"?: boolean,"points"?: number,"protein_g_goal"?: number | null,"sex"?: string | null,"survey"?: Json | null,"updated_at"?: string,"weight_kg"?: number | null
                  }
                  Relationships: [
                    
                  ]
                },"stake_ledger": {
                  Row: {
                    "created_at": string,"creditor_id": string,"debtor_id": string,"id": string,"partnership_id": string,"settled": boolean,"settled_at": string | null,"stake": string,"week_start": string
                  }
                  Insert: {
                    "created_at"?: string,"creditor_id": string,"debtor_id": string,"id"?: string,"partnership_id": string,"settled"?: boolean,"settled_at"?: string | null,"stake": string,"week_start": string
                  }
                  Update: {
                    "created_at"?: string,"creditor_id"?: string,"debtor_id"?: string,"id"?: string,"partnership_id"?: string,"settled"?: boolean,"settled_at"?: string | null,"stake"?: string,"week_start"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "stake_ledger_creditor_id_fkey"
      columns: ["creditor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stake_ledger_creditor_id_fkey"
      columns: ["creditor_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stake_ledger_debtor_id_fkey"
      columns: ["debtor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stake_ledger_debtor_id_fkey"
      columns: ["debtor_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stake_ledger_partnership_id_fkey"
      columns: ["partnership_id"]
isOneToOne: false
      referencedRelation: "partnerships"
      referencedColumns: ["id"]
    }
                  ]
                },"user_gifts": {
                  Row: {
                    "created_at": string,"from_user_id": string,"gift_id": string,"id": string,"message": string | null,"to_user_id": string,"wager_id": string | null
                  }
                  Insert: {
                    "created_at"?: string,"from_user_id": string,"gift_id": string,"id"?: string,"message"?: string | null,"to_user_id": string,"wager_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"from_user_id"?: string,"gift_id"?: string,"id"?: string,"message"?: string | null,"to_user_id"?: string,"wager_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_gifts_from_user_id_fkey"
      columns: ["from_user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_gifts_from_user_id_fkey"
      columns: ["from_user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_gifts_gift_id_fkey"
      columns: ["gift_id"]
isOneToOne: false
      referencedRelation: "gifts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_gifts_to_user_id_fkey"
      columns: ["to_user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_gifts_to_user_id_fkey"
      columns: ["to_user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_gifts_wager_id_fkey"
      columns: ["wager_id"]
isOneToOne: false
      referencedRelation: "wagers"
      referencedColumns: ["id"]
    }
                  ]
                },"wager_messages": {
                  Row: {
                    "created_at": string,"id": string,"text": string,"user_id": string,"wager_id": string
                  }
                  Insert: {
                    "created_at"?: string,"id"?: string,"text": string,"user_id": string,"wager_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"text"?: string,"user_id"?: string,"wager_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "wager_messages_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "wager_messages_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "wager_messages_wager_id_fkey"
      columns: ["wager_id"]
isOneToOne: false
      referencedRelation: "wagers"
      referencedColumns: ["id"]
    }
                  ]
                },"wager_participants": {
                  Row: {
                    "accepted": boolean,"current_value": number,"user_id": string,"wager_id": string
                  }
                  Insert: {
                    "accepted"?: boolean,"current_value"?: number,"user_id": string,"wager_id": string
                  }
                  Update: {
                    "accepted"?: boolean,"current_value"?: number,"user_id"?: string,"wager_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "wager_participants_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "wager_participants_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "wager_participants_wager_id_fkey"
      columns: ["wager_id"]
isOneToOne: false
      referencedRelation: "wagers"
      referencedColumns: ["id"]
    }
                  ]
                },"wagers": {
                  Row: {
                    "created_at": string,"creator_id": string,"description": string | null,"ends_at": string,"id": string,"metric": string,"starts_at": string,"status": string,"target": number | null,"title": string,"winner_id": string | null
                  }
                  Insert: {
                    "created_at"?: string,"creator_id": string,"description"?: string | null,"ends_at": string,"id"?: string,"metric": string,"starts_at": string,"status"?: string,"target"?: number | null,"title": string,"winner_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"creator_id"?: string,"description"?: string | null,"ends_at"?: string,"id"?: string,"metric"?: string,"starts_at"?: string,"status"?: string,"target"?: number | null,"title"?: string,"winner_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "wagers_creator_id_fkey"
      columns: ["creator_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "wagers_creator_id_fkey"
      columns: ["creator_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "wagers_winner_id_fkey"
      columns: ["winner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "wagers_winner_id_fkey"
      columns: ["winner_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"weekly_goals": {
                  Row: {
                    "days_done": number | null,"goal_days": number,"partnership_id": string,"result": string,"stake": string,"user_id": string,"week_start": string
                  }
                  Insert: {
                    "days_done"?: number | null,"goal_days": number,"partnership_id": string,"result"?: string,"stake": string,"user_id": string,"week_start": string
                  }
                  Update: {
                    "days_done"?: number | null,"goal_days"?: number,"partnership_id"?: string,"result"?: string,"stake"?: string,"user_id"?: string,"week_start"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "weekly_goals_partnership_id_fkey"
      columns: ["partnership_id"]
isOneToOne: false
      referencedRelation: "partnerships"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "weekly_goals_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "weekly_goals_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"workout_sets": {
                  Row: {
                    "completed": boolean,"created_at": string,"exercise_id": string,"id": string,"reps": number | null,"rpe": number | null,"set_index": number,"updated_at": string,"weight_kg": number | null,"workout_id": string
                  }
                  Insert: {
                    "completed"?: boolean,"created_at"?: string,"exercise_id": string,"id"?: string,"reps"?: number | null,"rpe"?: number | null,"set_index": number,"updated_at"?: string,"weight_kg"?: number | null,"workout_id": string
                  }
                  Update: {
                    "completed"?: boolean,"created_at"?: string,"exercise_id"?: string,"id"?: string,"reps"?: number | null,"rpe"?: number | null,"set_index"?: number,"updated_at"?: string,"weight_kg"?: number | null,"workout_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "workout_sets_exercise_id_fkey"
      columns: ["exercise_id"]
isOneToOne: false
      referencedRelation: "exercises"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "workout_sets_workout_id_fkey"
      columns: ["workout_id"]
isOneToOne: false
      referencedRelation: "workouts"
      referencedColumns: ["id"]
    }
                  ]
                },"workout_templates": {
                  Row: {
                    "days": NonNullable<Json>,"days_per_week": number,"description": string | null,"id": string,"name": string,"slug": string,"source_note": string | null
                  }
                  Insert: {
                    "days": NonNullable<Json>,"days_per_week": number,"description"?: string | null,"id"?: string,"name": string,"slug": string,"source_note"?: string | null
                  }
                  Update: {
                    "days"?: NonNullable<Json>,"days_per_week"?: number,"description"?: string | null,"id"?: string,"name"?: string,"slug"?: string,"source_note"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"workouts": {
                  Row: {
                    "created_at": string,"done_at": string | null,"ended_at": string | null,"generated_from": string | null,"id": string,"name": string,"notes": string | null,"started_at": string,"status": string,"updated_at": string,"user_id": string
                  }
                  Insert: {
                    "created_at"?: string,"done_at"?: string | null,"ended_at"?: string | null,"generated_from"?: string | null,"id"?: string,"name": string,"notes"?: string | null,"started_at"?: string,"status"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"done_at"?: string | null,"ended_at"?: string | null,"generated_from"?: string | null,"id"?: string,"name"?: string,"notes"?: string | null,"started_at"?: string,"status"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "workouts_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "workouts_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "public_profiles": {
                  Row: {
                    "avatar_url": string | null,"handle": string | null,"id": string | null,"name": string | null
                  }
                  Insert: {
                           "avatar_url"?: string | null,"handle"?: string | null,"id"?: string | null,"name"?: string | null
                         }
                        Update: {
                           "avatar_url"?: string | null,"handle"?: string | null,"id"?: string | null,"name"?: string | null
                         }
                        Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "ai_record":
{ Args: { "uid": string,"used": number }; Returns: undefined
                           },
"ai_take":
{ Args: { "food": boolean,"uid": string }; Returns: string
                           },
"award_points":
{ Args: { "delta": number,"ref": string,"uid": string,"why": string }; Returns: undefined
                           },
"challenge_value":
{ Args: { "metric": string,"t0": string,"t1": string,"uid": string }; Returns: number
                           },
"close_weeks":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"create_challenge":
{ Args: { "description": string,"ends_at": string,"invitee_handle": string,"metric": string,"starts_at": string,"target"?: number,"title": string }; Returns: string
                           },
"create_pact":
{ Args: { "goal_days": number,"partner_handle": string,"stake": string,"tz": string }; Returns: string
                           },
"credit_date":
{ Args: { "done_at": string,"started_at": string,"tz": string }; Returns: string
                           },
"days_done":
{ Args: { "tz": string,"uid": string,"ws": string }; Returns: number
                           },
"end_pact":
{ Args: { "p": string }; Returns: undefined
                           },
"is_partner":
{ Args: { "me": string,"other": string }; Returns: boolean
                           },
"is_wager_participant":
{ Args: { "w": string }; Returns: boolean
                           },
"mark_all_read":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"me_card":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"notify":
{ Args: { "body": Json,"kind": string,"uid": string }; Returns: undefined
                           },
"pact_week_days":
{ Args: { "p": string,"ws": string }; Returns: {
              "day": string,"late": boolean,"user_id": string,"verified": boolean,"workout_ids": (string)[]
            }[]
                           },
"recompute_challenges":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"refresh_challenge":
{ Args: { "w": string }; Returns: undefined
                           },
"respond_challenge":
{ Args: { "accept": boolean,"w": string }; Returns: undefined
                           },
"respond_pact":
{ Args: { "accept": boolean,"goal_days"?: number,"p": string,"stake"?: string }; Returns: undefined
                           },
"send_gift":
{ Args: { "gift": string,"note"?: string,"to_user": string,"wager"?: string }; Returns: undefined
                           },
"set_goal":
{ Args: { "goal_days": number,"p": string,"stake": string }; Returns: string
                           },
"settle_stake":
{ Args: { "ledger_id": string }; Returns: undefined
                           },
"week_close":
{ Args: { "tz": string,"ws": string }; Returns: string
                           },
"week_start_of":
{ Args: { "t": string,"tz": string }; Returns: string
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
