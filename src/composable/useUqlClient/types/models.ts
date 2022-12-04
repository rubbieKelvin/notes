export type UserWritable = {
  username: string;
  first_name: string;
  last_name: string;
};

export interface User extends UserWritable {
  last_login: null | string;
  id: string;
  date_created: string;
  notes: [];
}
