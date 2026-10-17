import mongoose from 'mongoose';

/**
 * Connects to the integration-test database. Refuses to run unless the URI names a
 * database ending in `_test` on a replica set, so these suites can never drop indexes
 * or delete documents in a development or production database.
 */
export async function connectIntegrationDb(): Promise<void> {
  const uri = process.env.TEST_MONGODB_URI;
  if (!uri) {
    throw new Error('TEST_MONGODB_URI is required for integration tests');
  }
  const dbName = new URL(uri.replace(/^mongodb(\+srv)?:/, 'http:')).pathname.replace(/^\//, '');
  if (!/_test$/.test(dbName)) {
    throw new Error(`Integration database name must end with _test (got "${dbName}")`);
  }
  await mongoose.connect(uri);
  const hello = await mongoose.connection.db!.admin().command({ hello: 1 });
  if (!hello.setName) {
    throw new Error('TEST_MONGODB_URI must be a replica set; standalone servers cannot run transactions');
  }
}
