const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const FacilityRating = sequelize.define(
  "FacilityRating",
  {
    rating_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    facility_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "facilities",
        key: "facility_id",
      },
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "user_id",
      },
    },
    rating: {
      type: DataTypes.DOUBLE,
      allowNull: false,
      validate: {
        min: 1.0,
        max: 5.0,
      },
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "facility_ratings",
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ["facility_id", "user_id"],
      },
    ],
  }
);

module.exports = FacilityRating;