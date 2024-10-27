export interface CDIPStation {
  timestamp: string; // UTC time of observation: mm.dd.YYYY-HH:MM:ss 10.27.2024-18:00:00
  station_number: string;
  station_name: string;
  latitude: number;
  longitude: number;
  depth_cm: number;
  hs_m: number; // Significant wave height in meters
  tp_s: number; // Peak period in seconds
  dp_deg: number | null; // Peak direction in degrees true, can be null
  sst_c: number | null; // Sea surface temperature in Celsius, can be null
}

export interface CDIPResponse {
  last_updated: string;
  data: CDIPStation[];
}
//h-----------------------------------------------------------------------------
//h .root/data_access/sccoos.cdip
//h
//h Returns tab-delimited table of recent wave data for each
//h station along with its latitude, longitude and depth. Designed for
//h use with the SCCOOS - http://www.sccoos.org/ - website. The format
//h details are as follows.
//h
//h Field #   Contents
//h -------   --------
//h    1      UTC time of observation: mm.dd.YYYY-HH:MM:ss
//h    2      Station number
//h    3      Station name
//h    4      Latitude
//h    5      Longitude
//h    6      Depth, in centimeters
//h    7      Hs, in meters
//h    8      Tp, in seconds
//h    9      Dp, degrees true
//h   10      SST, degrees Celsius
//h
//h Modified:
//h   13Sep2005 - asteriks to tab delimited
//h
//h-----------------------------------------------------------------------------
