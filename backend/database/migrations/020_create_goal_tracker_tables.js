/**
 * Migration: 020 - Create Goal Tracker tables
 * Sistema completo de seguimiento de objetivos financieros
 */

exports.up = function(knex) {
  return knex.schema
    // Tabla principal de objetivos financieros
    .createTable('financial_goals', function(table) {
      table.increments('id').primary();
      table.string('name', 255).notNullable();
      table.enum('type', ['CAPITAL', 'MONTHLY_INCOME', 'RETURN_RATE']).notNullable();
      table.decimal('target_amount', 12, 2); // Para CAPITAL y MONTHLY_INCOME
      table.date('target_date');
      table.decimal('monthly_contribution', 10, 2).defaultTo(0);
      table.decimal('expected_return_rate', 5, 2); // Porcentaje anual esperado
      table.date('created_date').defaultTo(knex.fn.now());
      table.enum('status', ['ACTIVE', 'ACHIEVED', 'PAUSED']).defaultTo('ACTIVE');
      table.text('description'); // Descripción opcional del objetivo
      table.string('currency', 3).defaultTo('USD'); // USD o ARS
      
      table.timestamps(true, true);
      table.index(['status', 'created_date']);
      table.index(['type']);
    })
    
    // Progreso histórico de objetivos
    .createTable('goal_progress', function(table) {
      table.increments('id').primary();
      table.integer('goal_id').unsigned().references('id').inTable('financial_goals').onDelete('CASCADE');
      table.date('date').notNullable();
      table.decimal('current_capital', 12, 2).notNullable(); // Capital actual en USD
      table.decimal('monthly_income', 10, 2).defaultTo(0); // Ingresos del mes
      table.decimal('actual_return_rate', 5, 2); // Rentabilidad real anual
      table.date('projected_completion_date'); // Fecha proyectada de completion
      table.decimal('progress_percentage', 5, 2).defaultTo(0); // % de progreso hacia la meta
      table.decimal('deviation_from_plan', 5, 2).defaultTo(0); // Desviación del plan original
      table.json('metrics'); // Métricas adicionales calculadas
      
      table.timestamps(true, true);
      table.unique(['goal_id', 'date']);
      table.index(['goal_id', 'date']);
    })
    
    // Simulaciones de escenarios para objetivos
    .createTable('goal_simulations', function(table) {
      table.increments('id').primary();
      table.integer('goal_id').unsigned().references('id').inTable('financial_goals').onDelete('CASCADE');
      table.date('simulation_date').defaultTo(knex.fn.now());
      table.string('scenario_name', 100).notNullable();
      table.decimal('extra_contribution', 10, 2).defaultTo(0); // Aporte extra simulado
      table.decimal('new_return_rate', 5, 2); // Nueva tasa de retorno simulada
      table.integer('impact_months'); // Duración del impacto en meses
      table.date('new_completion_date'); // Nueva fecha de completion proyectada
      table.decimal('time_saved_months', 5, 1); // Meses ahorrados/perdidos
      table.json('simulation_details'); // Detalles de la simulación
      
      table.timestamps(true, true);
      table.index(['goal_id', 'simulation_date']);
    })
    
    // Hitos y alertas para objetivos
    .createTable('goal_milestones', function(table) {
      table.increments('id').primary();
      table.integer('goal_id').unsigned().references('id').inTable('financial_goals').onDelete('CASCADE');
      table.string('milestone_name', 100).notNullable();
      table.decimal('milestone_amount', 12, 2); // Monto del hito
      table.decimal('milestone_percentage', 5, 2); // Porcentaje del objetivo
      table.date('target_date'); // Fecha objetivo del hito
      table.date('achieved_date'); // Fecha real de logro
      table.boolean('is_achieved').defaultTo(false);
      table.enum('priority', ['LOW', 'MEDIUM', 'HIGH']).defaultTo('MEDIUM');
      table.text('description');
      
      table.timestamps(true, true);
      table.index(['goal_id', 'is_achieved']);
      table.index(['target_date']);
    })
    
    // Configuración de alertas por objetivo
    .createTable('goal_alerts', function(table) {
      table.increments('id').primary();
      table.integer('goal_id').unsigned().references('id').inTable('financial_goals').onDelete('CASCADE');
      table.enum('alert_type', ['MILESTONE', 'DEVIATION', 'TIME_TARGET', 'PROGRESS_SLOW']).notNullable();
      table.boolean('is_enabled').defaultTo(true);
      table.decimal('threshold_value', 10, 2); // Valor umbral para la alerta
      table.enum('threshold_type', ['PERCENTAGE', 'AMOUNT', 'DAYS']).notNullable();
      table.string('message_template', 500); // Template del mensaje de alerta
      table.date('last_triggered'); // Última vez que se disparó
      table.integer('trigger_count').defaultTo(0); // Veces que se ha disparado
      
      table.timestamps(true, true);
      table.index(['goal_id', 'is_enabled']);
      table.index(['alert_type']);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('goal_alerts')
    .dropTableIfExists('goal_milestones')
    .dropTableIfExists('goal_simulations')
    .dropTableIfExists('goal_progress')
    .dropTableIfExists('financial_goals');
};