import {PartialType} from "@nestjs/mapped-types";
import {CreateVideoDto} from "./create-video.dto.js";

export class UpdateVideoDto extends PartialType(CreateVideoDto) {}