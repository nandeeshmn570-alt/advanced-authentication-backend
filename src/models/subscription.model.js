import mogoose, { schema } from "mongoose"

const subscriptionSchema = new schema({
  subscriber: {
    type: schema.Types.ObjectId, // one who is subscribing
    ref: "User"
  },
  channel: {
    type: Schema.Types.ObjectId, // one to whom 'subscriber' is subscribing
    ref: "User"
  }
}, { timestamps: true })
export const Subscription = mongoose.model("Subscription", subscriptionSchema)
