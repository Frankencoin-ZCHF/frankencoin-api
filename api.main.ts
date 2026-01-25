import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './api.module';
// import * as dotenv from 'dotenv';
// dotenv.config();

async function bootstrap() {
	const api = await NestFactory.create(AppModule, { logger: ['log', 'warn', 'error' /*, 'debug' */], cors: true });

	const config = new DocumentBuilder()
		.setTitle(process.env.npm_package_name)
		.setDescription(
			'REST API for the Frankencoin ecosystem providing real-time and historical data for the ZCHF stablecoin operations. ' +
				'Access ecosystem metrics, collateral positions, minter data, savings rates, price feeds, challenges, and analytics. ' +
				'TypeScript types and client utilities are available via the @frankencoin/api npm package.'
		)
		.setVersion(process.env.npm_package_version)
		.build();
	const document = SwaggerModule.createDocument(api, config);
	SwaggerModule.setup('/', api, document, {
		swaggerOptions: {
			persistAuthorization: true,
		},
	});

	await api.listen(process.env.PORT || 3000);
}
bootstrap();
