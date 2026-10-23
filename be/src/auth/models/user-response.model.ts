import { ApiProperty } from '@nestjs/swagger';
import {Provider} from "../enums/providedr.enum.js";

export class UserResponseModel {
    @ApiProperty({
        example: 1,
    })
    id: number;

    @ApiProperty({
        example: 'Иван Иванов',
    })
    name: string;

    @ApiProperty({
        example: 'ivan@example.com',
    })
    email: string;

    @ApiProperty({
        example: Provider.LOCAL,
        enum: Provider,
    })
    provider: Provider;
}