import { JSONContent } from '@tiptap/vue-3'

export interface User {
    id: number,
    last_login: string|null,
    is_superuser: boolean,
    email: boolean,
    name: string|null,
    date_joined: string,
    is_staff: boolean,
    is_active: boolean,
    groups: any[],
    user_permissions: any[]
}

export interface Note {
    id: string,
    author: User,
    name: string,
    private: boolean,
    created_at: string,
    last_edited: string,
    archived: boolean,
    slug: string,
    body?: JSONContent,
}

export interface SignupResponse {
    user: User,
    token: string
}