import api from 'src/app/core/api/apiProvider';
import { ContentOrigin, Content } from '../types/goals';

interface GetContentsParams {
  page: number;
  limit: number;
  origin?: ContentOrigin;
  search?: string;
  type?: 'quiz' | 'content';
}

interface ContentResponse {
  contents: Content[];
  total: number;
  hasMore: boolean;
  nextPage: number | null;
}

interface QuizResponse {
  quiz: {
    id: number;
    name: string;
  } | null;
}

interface Assessment {
  name: string,
  description: string
}

const ENDPOINTS = {
  CONTENTS: '/contents/',
};

export const getContents = async ({
  page = 1,
  limit = 10,
  origin,
  search,
  type,
}: GetContentsParams): Promise<ContentResponse> => {
  try {
    const response = await api.get(
      `${import.meta.env.VITE_API_URL}/contents/`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        params: {
          page,
          limit,
          origin,
          search,
        },
      }
    );

    const contents = response.data || [];

    // Filtrar contenidos
    let filteredContents = contents.filter((content: Content) => {
      if (!content.origin || content.origin !== origin) {
        return false;
      }

      // Solo filtramos los quiz cuando NO estamos en la sección de assessments
      if (type !== 'quiz' && origin === 'internal') {
        return !content.type?.toLowerCase().includes('quiz');
      }

      return true;
    });

    // Aplicar búsqueda si existe
    if (search) {
      const searchLower = search.toLowerCase();
      filteredContents = filteredContents.filter(
        (content: Content) =>
          content.name?.toLowerCase().includes(searchLower) ||
          content.description?.toLowerCase().includes(searchLower)
      );
    }

    return {
      contents: filteredContents,
      total: filteredContents.length,
      hasMore: false,
      nextPage: null,
    };
  } catch (error) {
    console.error('Error fetching contents:', error);
    return {
      contents: [],
      total: 0,
      hasMore: false,
      nextPage: null,
    };
  }
};

export const getAssessments = async ({
  search,
}: {
  search?: string;
}): Promise<ContentResponse> => {
  try {
    const response = await api.get(
      `${import.meta.env.VITE_API_URL}/contents/`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        params: {
          origin: 'internal',
          limit: 1000,
        },
      }
    );

    // Obtenemos solo los quizzes
    let assessments = (response.data || []).filter((content: Content) => {
      const type = content.type?.toLowerCase();
      return type?.includes('quiz');
    });

    // Aplicar búsqueda si existe
    if (search) {
      const searchLower = search.toLowerCase();
      assessments = assessments.filter(
        (assessment: Assessment) =>
          assessment.name?.toLowerCase().includes(searchLower) ||
          assessment.description?.toLowerCase().includes(searchLower)
      );
    }

    return {
      contents: assessments,
      total: assessments.length,
      hasMore: false,
      nextPage: null,
    };

  } catch (error) {
    return {
      contents: [],
      total: 0,
      hasMore: false,
      nextPage: null,
    };
  }
};

export const getContentQuiz = async (contentId: number) => {
  try {
    const { data } = await api.get(
      `${import.meta.env.VITE_API_URL}/goals/quiz/${contentId}/`
    );
    return data;
  } catch (error) {
    console.error('Error fetching content quiz:', error);
    return null;
  }
};
