import { InstrumentData } from '../models/SimpleInstrument.js';
import type { InstrumentCreateInput, InstrumentUpdateInput, InstrumentQueryInput } from '../schemas/instrument.schema.js';
export declare class SimpleInstrumentService {
    private instrumentModel;
    createInstrument(data: InstrumentCreateInput): Promise<InstrumentData>;
    getInstrumentById(id: number): Promise<InstrumentData>;
    getInstrumentBySymbol(symbol: string): Promise<InstrumentData>;
    getAllInstruments(filters?: InstrumentQueryInput): Promise<InstrumentData[]>;
    updateInstrument(id: number, data: InstrumentUpdateInput): Promise<InstrumentData>;
    deleteInstrument(id: number): Promise<void>;
    getESGInstruments(): Promise<InstrumentData[]>;
    getVeganInstruments(): Promise<InstrumentData[]>;
    searchInstruments(searchTerm: string): Promise<InstrumentData[]>;
    bulkCreateInstruments(instruments: InstrumentCreateInput[]): Promise<InstrumentData[]>;
    toggleESGCompliance(id: number): Promise<InstrumentData>;
    toggleVeganFriendly(id: number): Promise<InstrumentData>;
    deactivateInstrument(id: number): Promise<InstrumentData>;
    activateInstrument(id: number): Promise<InstrumentData>;
}
