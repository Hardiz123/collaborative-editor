import api from '@/lib/api';

export interface Document {
  id: string;
  title: string;
  content: string;
  owner_id: string;
  collaborator_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateDocumentRequest {
  title: string;
  content: string;
}

export interface AddCollaboratorRequest {
  email: string;
}

export const createDocument = async (data: CreateDocumentRequest) => {
  const response = await api.post<Document>('/documents', data);
  return response.data;
};

export const getDocuments = async () => {
  const response = await api.get<Document[]>('/documents');
  return response.data;
};

export const getDocument = async (id: string) => {
  const response = await api.get<Document>(`/documents/${id}`);
  return response.data;
};

export const updateDocument = async (id: string, data: CreateDocumentRequest) => {
  const response = await api.put<Document>(`/documents/${id}`, data);
  return response.data;
};

export const deleteDocument = async (id: string) => {
  await api.delete(`/documents/${id}`);
};

export const addCollaborator = async (id: string, email: string) => {
  const response = await api.post<Document>(`/documents/${id}/collaborators`, { email });
  return response.data;
};
