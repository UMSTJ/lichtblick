// SPDX-FileCopyrightText: Copyright (C) 2024-2025  UMS , Inc.
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

// eslint-disable-next-line filenames/match-exported
import { RosDatatypes } from "@lichtblick/suite-base/types/RosDatatypes";

const datatypes: RosDatatypes = new Map(
  Object.entries({
    "tf2_msgs/TFMessage": {
      definitions: [
        {
          type: "geometry_msgs/TransformStamped",
          name: "transforms",
          isArray: true,
          isComplex: true,
        },
      ],
    },
    "geometry_msgs/TransformStamped": {
      definitions: [
        { type: "std_msgs/Header", name: "header", isArray: false, isComplex: true },
        { type: "string", name: "child_frame_id", isArray: false, isComplex: false },
        { type: "geometry_msgs/Transform", name: "transform", isArray: false, isComplex: true },
      ],
    },
    "std_msgs/Header": {
      definitions: [
        { type: "uint32", name: "seq", isArray: false, isComplex: false },
        { type: "time", name: "stamp", isArray: false, isComplex: false },
        { type: "string", name: "frame_id", isArray: false, isComplex: false },
      ],
    },
    "geometry_msgs/Transform": {
      definitions: [
        { type: "geometry_msgs/Vector3", name: "translation", isArray: false, isComplex: true },
        { type: "geometry_msgs/Quaternion", name: "rotation", isArray: false, isComplex: true },
      ],
    },
    "geometry_msgs/Vector3": {
      definitions: [
        { type: "float64", name: "x", isArray: false, isComplex: false },
        { type: "float64", name: "y", isArray: false, isComplex: false },
        { type: "float64", name: "z", isArray: false, isComplex: false },
      ],
    },
    "geometry_msgs/Quaternion": {
      definitions: [
        { type: "float64", name: "x", isArray: false, isComplex: false },
        { type: "float64", name: "y", isArray: false, isComplex: false },
        { type: "float64", name: "z", isArray: false, isComplex: false },
        { type: "float64", name: "w", isArray: false, isComplex: false },
      ],
    },
    "sensor_msgs/Image": {
      definitions: [
        { type: "std_msgs/Header", name: "header", isArray: false, isComplex: true },
        { type: "uint32", name: "height", isArray: false, isComplex: false },
        { type: "uint32", name: "width", isArray: false, isComplex: false },
        { type: "string", name: "encoding", isArray: false, isComplex: false },
        { type: "uint8", name: "is_bigendian", isArray: false, isComplex: false },
        { type: "uint32", name: "step", isArray: false, isComplex: false },
        { type: "uint8", name: "data", isArray: true, isComplex: false },
      ],
    },
    "velodyne_msgs/VelodyneScan": {
      definitions: [
        { type: "std_msgs/Header", name: "header", isArray: false, isComplex: true },
        { type: "velodyne_msgs/VelodynePacket", name: "packets", isArray: true, isComplex: true },
      ],
    },
    "velodyne_msgs/VelodynePacket": {
      definitions: [
        { type: "time", name: "stamp", isArray: false, isComplex: false },
        { type: "uint8", name: "data", isArray: true, arrayLength: 1206, isComplex: false },
      ],
    },
    "sensor_msgs/PointCloud2": {
      definitions: [
        { type: "std_msgs/Header", name: "header", isArray: false, isComplex: true },
        { type: "uint32", name: "height", isArray: false, isComplex: false },
        { type: "uint32", name: "width", isArray: false, isComplex: false },
        { type: "sensor_msgs/PointField", name: "definitions", isArray: true, isComplex: true },
        { type: "bool", name: "is_bigendian", isArray: false, isComplex: false },
        { type: "uint32", name: "point_step", isArray: false, isComplex: false },
        { type: "uint32", name: "row_step", isArray: false, isComplex: false },
        { type: "uint8", name: "data", isArray: true, isComplex: false },
        { type: "bool", name: "is_dense", isArray: false, isComplex: false },
      ],
    },
    "sensor_msgs/PointField": {
      definitions: [
        { type: "uint8", name: "INT8", isConstant: true, value: 1 },
        { type: "uint8", name: "UINT8", isConstant: true, value: 2 },
        { type: "uint8", name: "INT16", isConstant: true, value: 3 },
        { type: "uint8", name: "UINT16", isConstant: true, value: 4 },
        { type: "uint8", name: "INT32", isConstant: true, value: 5 },
        { type: "uint8", name: "UINT32", isConstant: true, value: 6 },
        { type: "uint8", name: "FLOAT32", isConstant: true, value: 7 },
        { type: "uint8", name: "FLOAT64", isConstant: true, value: 8 },
        { type: "string", name: "name", isArray: false, isComplex: false },
        { type: "uint32", name: "offset", isArray: false, isComplex: false },
        { type: "uint8", name: "datatype", isArray: false, isComplex: false },
        { type: "uint32", name: "count", isArray: false, isComplex: false },
      ],
    },
    "sensor_msgs/Range": {
      definitions: [
        { type: "std_msgs/Header", name: "header", isArray: false, isComplex: true },
        { type: "uint8", name: "ULTRASOUND", isConstant: true, value: 0 },
        { type: "uint8", name: "INFRARED", isConstant: true, value: 1 },
        { type: "uint8", name: "radiation_type", isArray: false, isComplex: false },
        { type: "float32", name: "field_of_view", isArray: false, isComplex: false },
        { type: "float32", name: "min_range", isArray: false, isComplex: false },
        { type: "float32", name: "max_range", isArray: false, isComplex: false },
        { type: "float32", name: "range", isArray: false, isComplex: false },
      ],
    },
    "radar_driver/RadarTracks": {
      definitions: [
        { type: "std_msgs/Header", name: "header", isArray: false, isComplex: true },
        { type: "radar_driver/Track", name: "tracks", isArray: true, isComplex: true },
      ],
    },
    "radar_driver/Track": {
      definitions: [
        { type: "uint32", name: "status", isArray: false, isComplex: false },
        { type: "uint32", name: "number", isArray: false, isComplex: false },
        { type: "float32", name: "range", isArray: false, isComplex: false },
        { type: "float32", name: "rate", isArray: false, isComplex: false },
        { type: "float32", name: "accel", isArray: false, isComplex: false },
        { type: "float32", name: "angle", isArray: false, isComplex: false },
        { type: "float32", name: "width", isArray: false, isComplex: false },
        { type: "float32", name: "late_rate", isArray: false, isComplex: false },
        { type: "bool", name: "moving", isArray: false, isComplex: false },
        { type: "float32", name: "power", isArray: false, isComplex: false },
        { type: "float32", name: "absolute_rate", isArray: false, isComplex: false },
      ],
    },
    "diagnostic_msgs/DiagnosticStatus": {
      definitions: [
        { type: "int8", name: "OK", isConstant: true, value: 0 },
        { type: "int8", name: "WARN", isConstant: true, value: 1 },
        { type: "int8", name: "ERROR", isConstant: true, value: 2 },
        { type: "int8", name: "STALE", isConstant: true, value: 3 },
        { type: "int8", name: "level", isArray: false, isComplex: false },
        { type: "string", name: "name", isArray: false, isComplex: false },
        { type: "string", name: "message", isArray: false, isComplex: false },
        { type: "string", name: "hardware_id", isArray: false, isComplex: false },
        { type: "diagnostic_msgs/KeyValue", name: "values", isArray: true, isComplex: true },
      ],
    },
    "diagnostic_msgs/KeyValue": {
      definitions: [
        { type: "string", name: "key", isArray: false, isComplex: false },
        { type: "string", name: "value", isArray: false, isComplex: false },
      ],
    },
    "diagnostic_msgs/DiagnosticArray": {
      definitions: [
        { type: "std_msgs/Header", name: "header", isArray: false, isComplex: true },
        {
          type: "diagnostic_msgs/DiagnosticStatus",
          name: "status",
          isArray: true,
          isComplex: true,
        },
      ],
    },
    "sensor_msgs/TimeReference": {
      definitions: [
        { type: "std_msgs/Header", name: "header", isArray: false, isComplex: true },
        { type: "time", name: "time_ref", isArray: false, isComplex: false },
        { type: "string", name: "source", isArray: false, isComplex: false },
      ],
    },
    "sensor_msgs/NavSatFix": {
      definitions: [
        { type: "std_msgs/Header", name: "header", isArray: false, isComplex: true },
        { type: "sensor_msgs/NavSatStatus", name: "status", isArray: false, isComplex: true },
        { type: "float64", name: "latitude", isArray: false, isComplex: false },
        { type: "float64", name: "longitude", isArray: false, isComplex: false },
        { type: "float64", name: "altitude", isArray: false, isComplex: false },
        {
          type: "float64",
          name: "position_covariance",
          isArray: true,
          arrayLength: 9,
          isComplex: false,
        },
        { type: "uint8", name: "COVARIANCE_TYPE_UNKNOWN", isConstant: true, value: 0 },
        { type: "uint8", name: "COVARIANCE_TYPE_APPROXIMATED", isConstant: true, value: 1 },
        { type: "uint8", name: "COVARIANCE_TYPE_DIAGONAL_KNOWN", isConstant: true, value: 2 },
        { type: "uint8", name: "COVARIANCE_TYPE_KNOWN", isConstant: true, value: 3 },
        { type: "uint8", name: "position_covariance_type", isArray: false, isComplex: false },
      ],
    },
    "sensor_msgs/NavSatStatus": {
      definitions: [
        { type: "int8", name: "STATUS_NO_FIX", isConstant: true, value: -1 },
        { type: "int8", name: "STATUS_FIX", isConstant: true, value: 0 },
        { type: "int8", name: "STATUS_SBAS_FIX", isConstant: true, value: 1 },
        { type: "int8", name: "STATUS_GBAS_FIX", isConstant: true, value: 2 },
        { type: "int8", name: "status", isArray: false, isComplex: false },
        { type: "uint16", name: "SERVICE_GPS", isConstant: true, value: 1 },
        { type: "uint16", name: "SERVICE_GLONASS", isConstant: true, value: 2 },
        { type: "uint16", name: "SERVICE_COMPASS", isConstant: true, value: 4 },
        { type: "uint16", name: "SERVICE_GALILEO", isConstant: true, value: 8 },
        { type: "uint16", name: "service", isArray: false, isComplex: false },
      ],
    },
    "nav_msgs/Odometry": {
      definitions: [
        { type: "std_msgs/Header", name: "header", isArray: false, isComplex: true },
        { type: "string", name: "child_frame_id", isArray: false, isComplex: false },
        { type: "geometry_msgs/PoseWithCovariance", name: "pose", isArray: false, isComplex: true },
        {
          type: "geometry_msgs/TwistWithCovariance",
          name: "twist",
          isArray: false,
          isComplex: true,
        },
      ],
    },
    "geometry_msgs/PoseWithCovariance": {
      definitions: [
        { type: "geometry_msgs/Pose", name: "pose", isArray: false, isComplex: true },
        { type: "float64", name: "covariance", isArray: true, arrayLength: 36, isComplex: false },
      ],
    },
    "geometry_msgs/Pose": {
      definitions: [
        { type: "geometry_msgs/Point", name: "position", isArray: false, isComplex: true },
        { type: "geometry_msgs/Quaternion", name: "orientation", isArray: false, isComplex: true },
      ],
    },
    "geometry_msgs/Point": {
      definitions: [
        { type: "float64", name: "x", isArray: false, isComplex: false },
        { type: "float64", name: "y", isArray: false, isComplex: false },
        { type: "float64", name: "z", isArray: false, isComplex: false },
      ],
    },
    "geometry_msgs/TwistWithCovariance": {
      definitions: [
        { type: "geometry_msgs/Twist", name: "twist", isArray: false, isComplex: true },
        { type: "float64", name: "covariance", isArray: true, arrayLength: 36, isComplex: false },
      ],
    },
    "geometry_msgs/Twist": {
      definitions: [
        { type: "geometry_msgs/Vector3", name: "linear", isArray: false, isComplex: true },
        { type: "geometry_msgs/Vector3", name: "angular", isArray: false, isComplex: true },
      ],
    },
    "bond/Status": {
      definitions: [
        { type: "std_msgs/Header", name: "header", isArray: false, isComplex: true },
        { type: "string", name: "id", isArray: false, isComplex: false },
        { type: "string", name: "instance_id", isArray: false, isComplex: false },
        { type: "bool", name: "active", isArray: false, isComplex: false },
        { type: "float32", name: "heartbeat_timeout", isArray: false, isComplex: false },
        { type: "float32", name: "heartbeat_period", isArray: false, isComplex: false },
      ],
    },

    "visualization_msgs/MarkerArray": {
      definitions: [
        { isArray: true, isComplex: true, name: "markers", type: "visualization_msgs/Marker" },
      ],
    },
    "visualization_msgs/Marker": {
      definitions: [
        { type: "uint8", name: "ARROW", isConstant: true, value: 0 },
        { type: "uint8", name: "CUBE", isConstant: true, value: 1 },
        { type: "uint8", name: "SPHERE", isConstant: true, value: 2 },
        { type: "uint8", name: "CYLINDER", isConstant: true, value: 3 },
        { type: "uint8", name: "LINE_STRIP", isConstant: true, value: 4 },
        { type: "uint8", name: "LINE_LIST", isConstant: true, value: 5 },
        { type: "uint8", name: "CUBE_LIST", isConstant: true, value: 6 },
        { type: "uint8", name: "SPHERE_LIST", isConstant: true, value: 7 },
        { type: "uint8", name: "POINTS", isConstant: true, value: 8 },
        { type: "uint8", name: "TEXT_VIEW_FACING", isConstant: true, value: 9 },
        { type: "uint8", name: "MESH_RESOURCE", isConstant: true, value: 10 },
        { type: "uint8", name: "TRIANGLE_LIST", isConstant: true, value: 11 },
        { type: "uint8", name: "ADD", isConstant: true, value: 0 },
        { type: "uint8", name: "MODIFY", isConstant: true, value: 0 },
        { type: "uint8", name: "DELETE", isConstant: true, value: 2 },
        { type: "std_msgs/Header", name: "header", isArray: false, isComplex: true },
        { type: "string", name: "ns", isArray: false, isComplex: false },
        { type: "int32", name: "id", isArray: false, isComplex: false },
        { type: "int32", name: "type", isArray: false, isComplex: false },
        { type: "int32", name: "action", isArray: false, isComplex: false },
        { type: "geometry_msgs/Pose", name: "pose", isArray: false, isComplex: true },
        { type: "geometry_msgs/Vector3", name: "scale", isArray: false, isComplex: true },
        { type: "std_msgs/ColorRGBA", name: "color", isArray: false, isComplex: true },
        { type: "duration", name: "lifetime", isArray: false, isComplex: false },
        { type: "bool", name: "frame_locked", isArray: false, isComplex: false },
        { type: "geometry_msgs/Point", name: "points", isArray: true, isComplex: true },
        { type: "std_msgs/ColorRGBA", name: "colors", isArray: true, isComplex: true },
        { type: "string", name: "text", isArray: false, isComplex: false },
        { type: "string", name: "mesh_resource", isArray: false, isComplex: false },
        { type: "bool", name: "mesh_use_embedded_materials", isArray: false, isComplex: false },
      ],
    },
    "std_msgs/ColorRGBA": {
      definitions: [
        { type: "float32", name: "r", isArray: false, isComplex: false },
        { type: "float32", name: "g", isArray: false, isComplex: false },
        { type: "float32", name: "b", isArray: false, isComplex: false },
        { type: "float32", name: "a", isArray: false, isComplex: false },
      ],
    },
  }),
);

export default datatypes;
