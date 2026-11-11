import type {
  ContentStatus,
  QuestionDifficulty,
  QuestionType,
} from "@/domain/models/studyplay";
import type { QuestionEntity, QuestionResult } from "./questions.types";

export interface QuestionsRepository {
  listQuestionsByTopic(
    topicId: string
  ): Promise<QuestionResult<QuestionEntity[]>>;

  listQuestionsBySubject(
    subjectId: string
  ): Promise<QuestionResult<QuestionEntity[]>>;

  findQuestionById(
    questionId: string
  ): Promise<QuestionResult<QuestionEntity | null>>;

  createQuestionRecord(params: {
    topicId: string;
    authorId: string;
    type: QuestionType;
    prompt: string;
    explanation: string;
    difficulty: QuestionDifficulty;
    status: ContentStatus;
    sourceDocumentId: string | null;
    sourceDocumentName: string | null;
    sourcePage: number | null;
    version: number;
    options: Array<{
      id?: string;
      text: string;
      isCorrect: boolean;
      feedback: string;
      sortOrder: number;
    }>;
  }): Promise<QuestionResult<QuestionEntity>>;

  updateQuestionRecord(
    questionId: string,
    params: {
      type: QuestionType;
      prompt: string;
      explanation: string;
      difficulty: QuestionDifficulty;
      status: ContentStatus;
      sourceDocumentId: string | null;
      sourceDocumentName: string | null;
      sourcePage: number | null;
      version: number;
      options: Array<{
        id?: string;
        text: string;
        isCorrect: boolean;
        feedback: string;
        sortOrder: number;
      }>;
    }
  ): Promise<QuestionResult<QuestionEntity>>;

  updateQuestionStatus(
    questionId: string,
    status: ContentStatus
  ): Promise<QuestionResult<QuestionEntity>>;

  deleteQuestionRecord(
    questionId: string
  ): Promise<QuestionResult<{ deleted: true }>>;
}
