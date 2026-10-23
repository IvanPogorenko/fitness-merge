import {IsEmail, IsNotEmpty, IsString, MinLength} from 'class-validator';
import {ApiProperty} from "@nestjs/swagger";

export class RegisterDto {

    @ApiProperty({
        example: 'ivan@example.com',
    })
    @IsEmail({}, { message: 'Электронная почта недействительна'})
    @IsNotEmpty({message: ' электронная почта является обязательной'})
    email:string;

    @ApiProperty({
        example: 'password123',
        minLength: 6,
    })
    @IsString()
    @MinLength(6, {message: 'Пароль должен содержать не менее 6 символов'})
    password: string;

    @ApiProperty({
        example: 'Иван Петров',
    })
    @IsString()
    @IsNotEmpty({message: 'имя обязательно'})
    name: string;
}
