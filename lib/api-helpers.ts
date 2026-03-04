import { NextResponse } from "next/server";
import { readData, writeData } from "./data";

export function createCrudHandler<T extends { id: string }>(filename: string, seedData: T[]) {
  return {
    async GET() {
      let data = readData<T[]>(filename, []);
      if (data.length === 0 && seedData.length > 0) {
        writeData(filename, seedData);
        data = seedData;
      }
      return NextResponse.json(data);
    },
    async POST(req: Request) {
      const body = await req.json();
      const data = readData<T[]>(filename, []);
      const item = { ...body, id: body.id || `${Date.now()}` };
      data.push(item);
      writeData(filename, data);
      return NextResponse.json(item);
    },
    async PUT(req: Request) {
      const body = await req.json();
      let data = readData<T[]>(filename, []);
      data = data.map(d => d.id === body.id ? { ...d, ...body } : d);
      writeData(filename, data);
      return NextResponse.json(body);
    },
    async DELETE(req: Request) {
      const { searchParams } = new URL(req.url);
      const id = searchParams.get("id");
      let data = readData<T[]>(filename, []);
      data = data.filter(d => d.id !== id);
      writeData(filename, data);
      return NextResponse.json({ ok: true });
    },
  };
}

export function createSingletonHandler<T>(filename: string, seedData: T) {
  return {
    async GET() {
      let data = readData<T>(filename, null as unknown as T);
      if (!data) {
        writeData(filename, seedData);
        data = seedData;
      }
      return NextResponse.json(data);
    },
    async PUT(req: Request) {
      const body = await req.json();
      writeData(filename, body);
      return NextResponse.json(body);
    },
  };
}
