export interface QuizOption {
  key: string;
  letter: string;
  text: string;
  isCorrect: boolean;
}

export interface QuizQuestion {
  text: string; // O JSON do seu back-end usa "text"
  options: QuizOption[];
}

export interface DailyQuizResponse {
  questions: QuizQuestion[];
  alreadyCompleted: boolean;
  previousScore: number | null;
}

export interface UserResponse {
  questionIndex: number;
  selectedOptionKey: string;
}

export interface QuizAnswerRequest {
  score: number;
  responses: UserResponse[]; // Mudou de totalQuestions para responses
}

export interface QuizReviewDTO {
  statement: string;
  options: QuizOption[];
  selectedOptionKey: string;
  correct: boolean;
}