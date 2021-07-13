/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Ligature, ReadTx, WriteTx, Dataset } from "@ligature/ligature";
import { openDB, deleteDB, IDBPDatabase } from "idb";
import { LIDBReadTx } from './lidbreadtx';
import { LIDBWriteTx } from './lidbwritetx';

const datasets = 'datasets';
const statements = 'statements';
const entities = 'entities';
const attributes = 'attributes';
const stringValues = 'stringValues'
const byteArrayValues = 'byteArrayValues'
const objectStores = [datasets, statements, entities, attributes, stringValues, byteArrayValues];

export async function openLigatureIndexedDB(name: string): Promise<Ligature> {
    let db = await openDB(name, 1, {
        upgrade: (db) => {
            db.createObjectStore(datasets, {
                autoIncrement: true
            }).createIndex("name", "name", { unique: true });

            db.createObjectStore(statements);

            let entitiesOS = db.createObjectStore(entities, {
                autoIncrement: true
            })
            entitiesOS.createIndex("id", "id", { unique: true });
            entitiesOS.createIndex("datasets", "datasets", { multiEntry: true });

            let attributesOS = db.createObjectStore(attributes, {
                autoIncrement: true
            })
            attributesOS.createIndex("name", "name", { unique: true });
            attributesOS.createIndex("datasets", "datasets", { multiEntry: true });

            let stringValuesOS = db.createObjectStore(stringValues, {
                autoIncrement: true
            })
            stringValuesOS.createIndex("value", "value", { unique: true });
            stringValuesOS.createIndex("datasets", "datasets", { multiEntry: true });

            let byteArrayValuesOS = db.createObjectStore(byteArrayValues, {
                autoIncrement: true
            })
            byteArrayValuesOS.createIndex("value", "value", { unique: true });
            byteArrayValuesOS.createIndex("datasets", "datasets", { multiEntry: true });        
        }
    });
    return new LigatureIndexedDB(db);
}

class LigatureIndexedDB implements Ligature {
    private db: IDBPDatabase;
    private _isOpen = true;
    private name: string;

    constructor(db: IDBPDatabase) {
        this.db = db;
        this.name = db.name;
    }

    async allDatasets(): Promise<Array<Dataset>> {
        let res = Array<Dataset>();
        await (await this.db.getAll("datasets")).forEach(d => res.push(new Dataset(d.name)));
        return res;
    }

    async createDataset(dataset: Dataset): Promise<Dataset> {
        let tx = this.db.transaction(datasets, "readwrite", {durability: 'strict'});
        let dStore = tx.store;
        let res = await dStore.index('name').get(dataset.name);
        if (res == null) {
            await dStore.add({name: dataset.name});
            await tx.done;
            return Promise.resolve(dataset);
        } else {
            await tx.done;
            return Promise.resolve(dataset);
        }
    }

    async deleteDataset(dataset: Dataset): Promise<Dataset> {
        let tx = this.db.transaction(objectStores, "readwrite", { durability: "strict" });
        let dStore = tx.objectStore(datasets)
        let dsKey = await dStore.index('name').getKey(dataset.name);
        if (dsKey == null) {
            await tx.done;
            return Promise.resolve(dataset);
        } else {
            dStore.delete(dsKey);
            //TODO remove all entries involving the given Dataset from entities, attributes, string values, and byte array values object stores
            //TODO Lookup in datasets index for entities object store for matches of dsKey, remove entry from array if array length > 1, others delete entry
            //TODO Lookup in datasets index for attributes object store for matches of dsKey, remove entry from array if array length > 1, others delete entry
            //TODO Lookup in datasets index for string values object store for matches of dsKey, remove entry from array if array length > 1, others delete entry
            //TODO Lookup in datasets index for byte array values object store for matches of dsKey, remove entry from array if array length > 1, others delete entry
            return Promise.resolve(dataset);
        }
    }

    async datasetExists(dataset: Dataset): Promise<boolean> {
        let tx = this.db.transaction(datasets, "readonly");
        let dStore = tx.store;
        let res = await dStore.index('name').get(dataset.name);
        if (res == null) {
            await tx.done;
            return Promise.resolve(false);
        } else {
            await tx.done;
            return Promise.resolve(true);
        }
    }

    async matchDatasetPrefix(prefix: string): Promise<Array<Dataset>> {
        let tx = this.db.transaction(datasets, "readonly");
        let dStore = tx.store;
        let endLen = prefix.length-1;
        let prefixEnd = prefix.slice(0, endLen) + String.fromCharCode(prefix.charCodeAt(endLen)+1);
        let arr = Array<Dataset>();
        (await dStore.index('name').getAll(IDBKeyRange.bound(prefix, prefixEnd, false, true))).forEach((name: { name: string; }) => {
            arr.push(new Dataset(name.name));
        });
        return arr;
    }

    async matchDatasetRange(start: string, end: string): Promise<Array<Dataset>> {
        let tx = this.db.transaction(datasets, "readonly");
        let dStore = tx.store;
        let arr = Array<Dataset>();
        (await dStore.index('name').getAll(IDBKeyRange.bound(start, end, false, true))).forEach((name: { name: string; }) => {
            arr.push(new Dataset(name.name));
        });
        return arr;
    }

    async query<T>(dataset: Dataset, fn: (readTx: ReadTx) => Promise<T>): Promise<T> {
        let tx = this.db.transaction(objectStores, "readonly");
        let key = await tx.objectStore(datasets).index('name').getKey(dataset.name);
        if (key == undefined) {
            throw new Error("Dataset '" + dataset.name + "' doesn't exist.");
        } else {
            let readTx = new LIDBReadTx(tx, dataset, key.valueOf() as number);
            return fn(readTx);    
        }
    }

    async write<T>(dataset: Dataset, fn: (writeTx: WriteTx) => Promise<T>): Promise<T> {
        let tx = this.db.transaction(objectStores, "readwrite", { durability: "strict" });
        let key = await tx.objectStore(datasets).index('name').getKey(dataset.name);
        if (key == undefined) {
            throw new Error("Dataset '" + dataset.name + "' doesn't exist.");
        } else {
            let writeTx = new LIDBWriteTx(tx, dataset, key.valueOf() as number);
            return fn(writeTx);
        }
    }

    close(deleteDb: boolean = false): Promise<void> { //TODO needs error handling
        if (deleteDb) {
            this.db.close();
            this._isOpen = false;
            deleteDB(this.name);
            return Promise.resolve();
        } else {
            this.db.close();
            this._isOpen = false;
            return Promise.resolve();
        }
    }

    isOpen(): boolean {
        return this._isOpen
    }
}
