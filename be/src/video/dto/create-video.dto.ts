import { ApiProperty } from '@nestjs/swagger';
import {
    IsInt,
    IsNotEmpty,
    IsPositive,
    IsString,
    Min,
} from 'class-validator';

export class CreateVideoDto {
    @ApiProperty({
        example: 'Утренняя зарядка',
        description: 'Название видео',
    })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty({
        example: 'ОФП',
        description: 'Тема видео',
    })
    @IsString()
    @IsNotEmpty()
    topic: string;

    @ApiProperty({
        example: '600',
        description: 'Продолжительность видео в секундах',
    })
    @IsString()
    @IsNotEmpty()
    duration: string;

    @ApiProperty({
        example: 'Комплекс упражнений для утренней зарядки',
        description: 'Описание видео',
    })
    @IsString()
    @IsNotEmpty()
    description: string;

    @ApiProperty({
        example: 15000000,
        description: 'Размер видео в байтах',
    })
    @IsInt()
    @IsPositive()
    size: number;
}