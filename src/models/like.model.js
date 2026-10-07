import mongoose, { Schema } from "mongoose";

const likeSchema = new Schema(
    {
        video: {
            type: Schema.Types.ObjectId,
            ref: "Video"
        },

        comment: {
            type: Schema.Types.ObjectId,
            ref: "Comment"
        },

        tweet: {
            type: Schema.Types.ObjectId,
            ref: "Tweet"
        },

        likedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        }
    },
    {
        timestamps: true
    }
);

// Ensure that exactly one item is liked
likeSchema.pre("validate", function (next) {
    const targets = [this.video, this.comment, this.tweet];

    const numberOfTargets = targets.filter(
        target => target != null
    ).length;

    if (numberOfTargets !== 1) {
        return next(
            new Error(
                "A like must belong to exactly one video, comment, or tweet."
            )
        );
    }

    next();
});

// Prevent the same user from liking the same video twice
likeSchema.index(
    {
        video: 1,
        likedBy: 1
    },
    {
        unique: true,
        partialFilterExpression: {
            video: { $type: "objectId" }
        }
    }
);

// Prevent the same user from liking the same comment twice
likeSchema.index(
    {
        comment: 1,
        likedBy: 1
    },
    {
        unique: true,
        partialFilterExpression: {
            comment: { $type: "objectId" }
        }
    }
);

// Prevent the same user from liking the same tweet twice
likeSchema.index(
    {
        tweet: 1,
        likedBy: 1
    },
    {
        unique: true,
        partialFilterExpression: {
            tweet: { $type: "objectId" }
        }
    }
);

export const Like = mongoose.model("Like", likeSchema);