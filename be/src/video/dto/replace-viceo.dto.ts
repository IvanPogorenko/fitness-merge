import {
    IsInt,
    IsNotEmpty,
    IsPositive,
    IsString, Length,
} from 'class-validator';

export class ReplaceVideoDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsNotEmpty()
    topic: string;

    @IsString()
    @IsNotEmpty()
    duration: string;

    @IsString()
    @IsNotEmpty()
    @Length(10)
    description: string;

    @IsInt()
    @IsPositive()
    size: number;
}