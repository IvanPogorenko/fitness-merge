import { ChannelEntity } from './channel.entity.js';
import { FavoriteEntity } from './favorite.entity.js';
import { PlaylistItemEntity } from './playlist-item.entity.js';
import { PlaylistEntity } from './playlist.entity.js';
import { TagEntity } from './tag.entity.js';
import { UserEntity } from './user.entity.js';
import { VideoTagEntity } from './video-tag.entity.js';
import { VideoEntity } from './video.entity.js';

export { ChannelEntity, FavoriteEntity, PlaylistEntity, PlaylistItemEntity, TagEntity, UserEntity, VideoEntity, VideoTagEntity };

export const ENTITIES = [UserEntity, ChannelEntity, VideoEntity, TagEntity, VideoTagEntity, PlaylistEntity, PlaylistItemEntity, FavoriteEntity];
