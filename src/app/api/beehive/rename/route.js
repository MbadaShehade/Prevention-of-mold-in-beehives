import { NextResponse } from 'next/server';
import clientPromise from '@/app/_lib/mongodb';

export async function POST(request) {
  try {
    const { groupId, hiveId, newName, email } = await request.json();
    const client = await clientPromise;
    const db = client.db('MoldInBeehives');
    const users = db.collection('users');

    // Update the hive name in the correct group and hive
    const result = await users.updateOne(
      {
        email: email,
        'beehives.id': groupId,
        'beehives.hives.id': hiveId
      },
      {
        $set: {
          'beehives.$[group].hives.$[hive].name': newName
        }
      },
      {
        arrayFilters: [
          { 'group.id': groupId },
          { 'hive.id': hiveId }
        ]
      }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: 'Failed to rename hive' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Hive renamed successfully',
      hiveId,
      newName
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
