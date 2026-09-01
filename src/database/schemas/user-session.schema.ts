import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

import { AuthProvider } from '../../core/enums/auth-provider.enum';

export type UserSessionDocument = HydratedDocument<UserSession>;

@Schema({
  collection: 'user_sessions',
})
export class UserSession {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId!: string;

  @Prop({
    type: String,
    enum: Object.values(AuthProvider),
    required: true,
    index: true,
  })
  authProvider!: AuthProvider;

  @Prop({
    type: String,
    required: true,
  })
  loginAt!: string;

  @Prop({
    type: String,
    default: null,
  })
  logoutAt!: string | null;

  @Prop({
    type: String,
    select: false,
    default: null,
  })
  refreshTokenHash!: string | null;

  @Prop({
    type: Boolean,
    default: true,
    index: true,
  })
  isActive!: boolean;
}

export const UserSessionSchema = SchemaFactory.createForClass(UserSession);

UserSessionSchema.index({
  userId: 1,
  isActive: 1,
});

UserSessionSchema.index({
  userId: 1,
  authProvider: 1,
});

UserSessionSchema.index({
  loginAt: -1,
});
