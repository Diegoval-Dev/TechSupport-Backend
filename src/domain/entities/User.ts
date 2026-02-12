import { UserRole } from '../enums/UserRole';

export interface UserProps {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  active: boolean;
}

export class User {
  constructor(private readonly props: UserProps) {}

  get id() {
    return this.props.id;
  }

  get email() {
    return this.props.email;
  }

  get role() {
    return this.props.role;
  }

  get passwordHash() {
    return this.props.passwordHash;
  }

  get active() {
    return this.props.active;
  }
}
