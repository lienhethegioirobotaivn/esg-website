import { Module } from "@nestjs/common";

import { AdminPostsController } from "./admin-posts.controller.js";
import { AdminUploadController } from "./admin-upload.controller.js";
import { PostFilesController } from "./post-files.controller.js";
import { PostImagesService } from "./post-images.service.js";
import { PostLikesService } from "./post-likes.service.js";
import { PostsController } from "./posts.controller.js";
import { PostsService } from "./posts.service.js";

@Module({
  controllers: [PostsController, PostFilesController, AdminPostsController, AdminUploadController],
  providers: [PostsService, PostImagesService, PostLikesService],
  exports: [PostImagesService],
})
export class PostsModule {}
