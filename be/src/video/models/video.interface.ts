import { ApiProperty } from '@nestjs/swagger';

export class VideoModel {
    @ApiProperty({
        example: 1,
    })
    id: number;

    @ApiProperty({
        example: 'Утренняя зарядка',
    })
    title: string;

    @ApiProperty({
        example: 'ОФП',
    })
    topic: string;

    @ApiProperty({
        example: 600,
    })
    duration: string;

    @ApiProperty({
        example: 'Комплекс упражнений для утренней зарядки',
    })
    description: string;

    @ApiProperty({
        example: 15000000,
    })
    size: number;
}