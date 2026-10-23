import { ApiProperty } from '@nestjs/swagger';

import { UserResponseModel } from './user-response.model.js';

export class AuthResponseModel {
    @ApiProperty({
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    })
    accessToken: string;

    @ApiProperty({
        type: UserResponseModel,
    })
    user: UserResponseModel;
}