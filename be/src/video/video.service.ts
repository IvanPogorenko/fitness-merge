import {
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import {CreateVideoDto} from "./dto/create-video.dto.js";
import {UpdateVideoDto} from "./dto/update-video.dto.js";
import {ReplaceVideoDto} from "./dto/replace-viceo.dto.js";
import {VideoModel} from "./models/video.interface.js";
import {videos} from "../mockData/videos.mock.js";

@Injectable()
export class VideoService {
    private readonly videos = videos

    findAll(): VideoModel[] {
        return this.videos;
    }

    findOne(id: number): VideoModel {
        const video = this.videos.find((video) => video.id === id);

        if (!video) {
            throw new NotFoundException(`Video with id ${id} not found`);
        }

        return video;
    }

    create(createVideoDto: CreateVideoDto): VideoModel {
        const newVideo: VideoModel = {
            id: this.getNextId(),
            ...createVideoDto,
        };

        this.videos.push(newVideo);

        return newVideo;
    }

    update(id: number, updateVideoDto: UpdateVideoDto): VideoModel {
        const video = this.findOne(id);

        Object.assign(video, updateVideoDto);

        return video;
    }

    replace(id: number, replaceVideoDto: ReplaceVideoDto): VideoModel {
        const videoIndex = this.videos.findIndex((video) => video.id === id);

        if (videoIndex === -1) {
            throw new NotFoundException(`Video with id ${id} not found`);
        }

        const replacedVideo: VideoModel = {
            id,
            ...replaceVideoDto,
        };

        this.videos[videoIndex] = replacedVideo;

        return replacedVideo;
    }

    remove(id: number): void {
        const videoIndex = this.videos.findIndex((video) => video.id === id);

        if (videoIndex === -1) {
            throw new NotFoundException(`Video with id ${id} not found`);
        }

        this.videos.splice(videoIndex, 1);
    }

    private getNextId(): number {
        if (this.videos.length === 0) {
            return 1;
        }

        return Math.max(...this.videos.map((video) => video.id)) + 1;
    }
}