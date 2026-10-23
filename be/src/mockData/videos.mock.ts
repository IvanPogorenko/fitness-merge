import {VideoModel} from "../video/models/video.interface.js";

export const videos: VideoModel[] = [
    {
        id: 1,
        title: 'Утренняя зарядка',
        topic: 'ОФП',
        duration: '600',
        description: 'Комплекс упражнений для утренней зарядки.',
        size: 15_000_000,
    },
    {
        id: 2,
        title: 'Упражнения для спины',
        topic: 'ЛФК',
        duration: '900',
        description: 'Комплекс упражнений для укрепления мышц спины.',
        size: 24_000_000,
    },
];
