"use strict";
module.exports = (sequelize, DataTypes) => {
  const FacilityRating = sequelize.define("FacilityRating", {
    rating_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    facility_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    rating: {
      type: DataTypes.FLOAT,  // Changed from INTEGER to FLOAT
      allowNull: false,
      validate: {
        min: 1.0,  // Minimum rating value
        max: 5.0   // Maximum rating value
      }
    },
    comment: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
  }, {
    tableName: "facility_ratings",
    timestamps: false,
  });

  FacilityRating.associate = function (models) {
    FacilityRating.belongsTo(models.Facility, { foreignKey: "facility_id" });
  };

  return FacilityRating;
};