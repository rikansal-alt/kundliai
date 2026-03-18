import mongoose, { Schema, Document, Model } from "mongoose";

export interface PlanetData {
  sign: string;
  house: number;
  degree: number;
  exalted?: boolean;
  debilitated?: boolean;
  retrograde?: boolean;
  nakshatra?: string;
  nakshatraLord?: string;
  nakshatraPada?: number;
  longitude?: number;
  signIndex?: number;
}

export interface MahadashaData {
  planet: string;
  startYear: number;
  endYear: number;
}

export interface ChartData {
  ascendant: string;
  moonSign: string;
  sunSign: string;
  planets: Record<string, PlanetData>;
  mahadasha: MahadashaData;
  themes: string[];
  summary: string;
}

export interface BirthDetails {
  name: string;
  date: string;
  time: string;
  city: string;
  lat?: number;
  lng?: number;
}

export interface DailyCache {
  date: string;
  prediction: string;
  muhurat: string[];
}

export interface IChart extends Document {
  userId: string;
  birthDetails: BirthDetails;
  chartData: ChartData;
  dailyCache?: DailyCache;
  createdAt: Date;
  updatedAt: Date;
}

const PlanetSchema = new Schema<PlanetData>(
  {
    sign:           { type: String, required: true },
    house:          { type: Number, required: true },
    degree:         { type: Number, required: true },
    exalted:        Boolean,
    debilitated:    Boolean,
    retrograde:     Boolean,
    nakshatra:      String,
    nakshatraLord:  String,
    nakshatraPada:  Number,
    longitude:      Number,
    signIndex:      Number,
  },
  { _id: false }
);

const ChartSchema = new Schema<IChart>(
  {
    userId: { type: String, required: true, index: true },

    birthDetails: {
      name: { type: String, required: true },
      date: { type: String, required: true },
      time: String,
      city: { type: String, required: true },
      lat:  Number,
      lng:  Number,
    },

    chartData: {
      ascendant: String,
      moonSign:  String,
      sunSign:   String,
      planets:   { type: Map, of: PlanetSchema },
      mahadasha: {
        planet:    String,
        startYear: Number,
        endYear:   Number,
      },
      themes:  [String],
      summary: String,
    },

    dailyCache: {
      date:       String,
      prediction: String,
      muhurat:    [String],
    },
  },
  { timestamps: true }
);

const Chart: Model<IChart> =
  mongoose.models.Chart ?? mongoose.model<IChart>("Chart", ChartSchema);

export default Chart;
