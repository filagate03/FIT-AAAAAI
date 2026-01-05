import { Profile } from '../types';

const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
};

/**
 * Calculates Basal Metabolic Rate (BMR) using the Mifflin-St Jeor equation.
 */
export const calculateBMR = (profile: Profile): number => {
    const { weightKg, heightCm, age, gender } = profile;

    if (gender === 'male') {
        return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
    } else { // 'female' or 'other'
        return 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
    }
};

/**
 * Calculates Total Daily Energy Expenditure (TDEE).
 */
export const calculateTDEE = (bmr: number, activityLevel: Profile['activityLevel']): number => {
    return bmr * activityMultipliers[activityLevel];
};

/**
 * Calculates a goal-oriented daily calorie intake.
 * Adjusts TDEE for weight loss/gain goals with a safe minimum.
 */
export const calculateCalorieGoal = (
    tdee: number,
    currentWeight: number,
    goalWeight: number,
    gender: Profile['gender']
): number => {
    const CALORIE_ADJUSTMENT = 400; // Deficit for loss, surplus for gain
    const MIN_CALORIES_MALE = 1500;
    const MIN_CALORIES_FEMALE = 1200;

    let calorieGoal = tdee;

    if (goalWeight < currentWeight) {
        // Weight loss goal
        calorieGoal = tdee - CALORIE_ADJUSTMENT;
    } else if (goalWeight > currentWeight) {
        // Weight gain goal
        calorieGoal = tdee + CALORIE_ADJUSTMENT;
    }
    // else: maintenance goal, calorieGoal remains tdee

    // Ensure the goal is not below a safe minimum
    const minimumCalories = (gender === 'male') ? MIN_CALORIES_MALE : MIN_CALORIES_FEMALE;
    
    return Math.max(calorieGoal, minimumCalories);
};


/**
 * Calculates recommended macronutrients based on a target calorie amount.
 * Ratio: 40% Carbs, 30% Protein, 30% Fat
 */
export const calculateMacros = (calories: number): { protein: number; fat: number; carbs: number } => {
    // Protein: 30% of calories, 4 kcal/g
    const protein = (calories * 0.30) / 4;
    
    // Fat: 30% of calories, 9 kcal/g
    const fat = (calories * 0.30) / 9;

    // Carbs: 40% of calories, 4 kcal/g
    const carbs = (calories * 0.40) / 4;

    return { protein, fat, carbs };
};