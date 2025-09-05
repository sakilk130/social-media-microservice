import Joi from 'joi';

const validateCreatePost = (data: any) => {
  const schema = Joi.object({
    content: Joi.string().min(3).max(5000).required(),
    media_ids: Joi.array(),
  });

  return schema.validate(data);
};

export { validateCreatePost };
