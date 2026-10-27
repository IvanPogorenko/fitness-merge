import { DataSource } from 'typeorm';
import { config } from 'dotenv'

config();

export default new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '1234',
    database: process.env.DB_NAME || 'fitness_merge_dev',
    entities: [__dirname + '/**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/src/database/migration/*{.ts,.js}'],
    synchronize: false,
});