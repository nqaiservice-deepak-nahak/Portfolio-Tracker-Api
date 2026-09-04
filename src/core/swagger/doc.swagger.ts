import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerCustomOptions, SwaggerModule } from '@nestjs/swagger';

export const setUpSwagger = (app: INestApplication) => {
  const config = new DocumentBuilder().setTitle('PORTFOLIO TRACKER').setVersion('1.0').addBearerAuth().build(),
    swaggerDoc = SwaggerModule.createDocument(app, config),
    customOptions: SwaggerCustomOptions = {
      customSiteTitle: 'Owner Service',
      customCss: `.swagger-ui .topbar { background-color: #ffffff; border-bottom: 5px solid #3f51b5; }`
    };

  SwaggerModule.setup('api/v1/docs', app, swaggerDoc, customOptions);
  // writeFileSync('./owner-svc-swagger-spec.json', JSON.stringify(swaggerDoc));
};
