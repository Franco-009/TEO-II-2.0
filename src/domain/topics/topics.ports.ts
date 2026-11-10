import type { TopicEntity, TopicResult } from "./topics.types";

export interface TopicsRepository {
  listBySubject(subjectId: string): Promise<TopicResult<TopicEntity[]>>;
  findTopicById(topicId: string): Promise<TopicResult<TopicEntity | null>>;
  createTopic(params: {
    subjectId: string;
    parentTopicId: string | null;
    title: string;
    description: string;
    sortOrder: number;
  }): Promise<TopicResult<TopicEntity>>;
  updateTopic(
    topicId: string,
    params: {
      parentTopicId: string | null;
      title: string;
      description: string;
      sortOrder: number;
    }
  ): Promise<TopicResult<TopicEntity>>;
  deleteTopic(topicId: string): Promise<TopicResult<{ deleted: true }>>;
}
