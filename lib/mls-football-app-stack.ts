import * as cdk from '@aws-cdk/core';
import { AttributeType, BillingMode, Table } from '@aws-cdk/aws-dynamodb';
import { CfnApiKey, CfnDataSource, CfnGraphQLApi, CfnGraphQLSchema, IamResource } from '@aws-cdk/aws-appsync';
import { ManagedPolicy, Role, ServicePrincipal } from '@aws-cdk/aws-iam';

export class MlsFootballAppStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    //### Dynamo Tables
    const playersTableName = 'player';
    const gamesTableName = 'Games';

    const playersTable = new Table(this, 'MlsFootballPlayers', {
      tableName: playersTableName,
      partitionKey: {
        name: playersTableName + 'Id',
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    const gamesTable = new Table(this, 'MlsFootballGames', {
      tableName: gamesTableName,
      partitionKey: {
        name: gamesTableName + 'Id',
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    // CFN Api
    const footballGraphQLApi = new CfnGraphQLApi(this, 'FootballApi', {
      name: 'football-api',
      authenticationType: 'API_KEY',
    });

    new CfnApiKey(this, 'FootballApiKey', {
      apiId: footballGraphQLApi.attrApiId
    });

    const apiSchema = new CfnGraphQLSchema(this, 'FootballSchema', {
      apiId: footballGraphQLApi.attrApiId,
      definition: `type ${playersTableName} {
        ${playersTableName}Id: ID!
        name: String
        phone: String
      }
      type Paginated${playersTableName} {
        items: [${playersTableName}!]!
        nextToken: String
      }
      type Query {
        allPlayers(limit: Int, nextToken: String): Paginated${playersTableName}!
        getOnePlayer(${playersTableName}Id: ID!): ${playersTableName}
      }
      type Mutation {
        savePlayer(name: String!): ${playersTableName}
        deletePlayer(${playersTableName}Id: ID!): ${playersTableName}
      }
      type Schema {
        query: Query
        mutation: Mutation
      }`
    });

    const footballRole = new Role(this, 'ItemsDynamoDBRole', {
      assumedBy: new ServicePrincipal('appsync.amazonaws.com')
    });

    footballRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AmazonDynamoDBFullAccess'));

    const dataSource = new CfnDataSource(this, 'PlayersDataSource', {
      apiId: footballGraphQLApi.attrApiId,
      name: 'PlayersDynamoDataSource',
      type: 'AMAZON_DYNAMODB',
      dynamoDbConfig: {
        tableName: playersTable.tableName,
        awsRegion: this.region
      },
      serviceRoleArn: footballRole.roleArn
    });

  }
}
