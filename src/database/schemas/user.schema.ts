import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { AuthProvider } from '../../core/enums/auth-provider.enum';

export type UserDocument = HydratedDocument<User>;

@Schema({
  timestamps: true,
  collection: 'users',
})
export class User {
  @Prop({
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  })
  name!: string;

  @Prop({
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: 150,
  })
  email!: string;

  @Prop({
    type: String,
    required: false,
    default: null,
    select: false,
  })
  passwordHash!: string | null;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(AuthProvider),
    default: AuthProvider.NATIVE,
  })
  authProvider!: AuthProvider;

  @Prop({
    type: String,
    required: false,
    default: null,
  })
  microsoftId!: string | null;

  @Prop({
    type: String,
    required: false,
    default: null,
    select: false,
  })
  refreshTokenHash!: string | null;

  @Prop({
    type: Boolean,
    required: true,
    default: true,
  })
  isActive!: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ microsoftId: 1 }, { sparse: true });
