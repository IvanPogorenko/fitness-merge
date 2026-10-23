import { Injectable } from '@nestjs/common';
import {SearchVideoDto, SortOrder, VideoSearchSortBy} from "./dto/search-video.dto.js";
import {SearchVideoResponseDto} from "./models/search-video.model.js";
import {videos} from "../mockData/videos.mock.js";

@Injectable()
export class SearchService {

    search(searchDto: SearchVideoDto): SearchVideoResponseDto {
        const {
            q,
            topic,
            page = 1,
            limit = 10,
            sortBy,
            order = SortOrder.ASC,
        } = searchDto;

        let result = [...videos];

        if (q?.trim()) {
            const query = q.trim().toLocaleLowerCase();

            result = result.filter((video) =>
                [
                    video.title,
                    video.topic,
                    video.description,
                ].some((field) =>
                    field.toLocaleLowerCase().includes(query),
                ),
            );
        }

        if (topic?.trim()) {
            const normalizedTopic = topic
                .trim()
                .toLocaleLowerCase();

            result = result.filter(
                (video) =>
                    video.topic.toLocaleLowerCase() ===
                    normalizedTopic,
            );
        }

        if (sortBy) {
            result.sort((a, b) => {
                let comparison = 0;

                switch (sortBy) {
                    case VideoSearchSortBy.TITLE:
                        comparison = a.title.localeCompare(
                            b.title,
                            'ru',
                        );
                        break;

                    case VideoSearchSortBy.DURATION:
                        comparison =
                            Number(a.duration) -
                            Number(b.duration);
                        break;

                    case VideoSearchSortBy.SIZE:
                        comparison = a.size - b.size;
                        break;
                }

                return order === SortOrder.DESC
                    ? -comparison
                    : comparison;
            });
        }

        const total = result.length;

        const totalPages = Math.ceil(total / limit);

        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;

        result = result.slice(startIndex, endIndex);

        return {
            data: result,
            total,
            page,
            limit,
            totalPages,
        };
    }

}
