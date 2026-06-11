const paginate = (model, query = {}, options = {}) => {
  const {
    page = 1,
    limit = 20,
    sort = { createdAt: -1 },
    populate = '',
    select = ''
  } = options;

  const skip = (page - 1) * limit;

  return Promise.all([
    model.find(query).select(select).sort(sort).skip(skip).limit(limit).populate(populate),
    model.countDocuments(query)
  ]).then(([docs, total]) => ({
    docs,
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    pages: Math.ceil(total / limit)
  }));
};

module.exports = { paginate };
