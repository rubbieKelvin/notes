import { get_my_notes, get_user } from '@/packages/api'
import { Note, User } from '@/packages/api/types/models'
import {defineStore} from 'pinia'

export default defineStore('account', {
    state: () => ({
        user_: <User|null>null,
        notes_: <Note[]>[],
    }),
    actions: {
        async getUser(){
            if (this.user_) return this.user_
            const u = await get_user()
            this.user_ = u
            return u
        },
        async getNotes() {
            const n = await get_my_notes()
            this.notes_ = n
            return n
        }
    },
})