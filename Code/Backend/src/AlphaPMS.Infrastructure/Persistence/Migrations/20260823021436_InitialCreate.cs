using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AlphaPMS.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "projects",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "TEXT", nullable: false),
                    code = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    name = table.Column<string>(type: "TEXT", maxLength: 300, nullable: false),
                    description = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: false),
                    status = table.Column<string>(type: "TEXT", maxLength: 30, nullable: false),
                    start_date = table.Column<DateOnly>(type: "TEXT", nullable: true),
                    finish_date = table.Column<DateOnly>(type: "TEXT", nullable: true),
                    investor = table.Column<string>(type: "TEXT", maxLength: 300, nullable: false),
                    location = table.Column<string>(type: "TEXT", maxLength: 500, nullable: false),
                    manager = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    budget = table.Column<decimal>(type: "TEXT", precision: 18, scale: 2, nullable: false),
                    progress_percent = table.Column<decimal>(type: "TEXT", precision: 5, scale: 2, nullable: false),
                    is_visible = table.Column<bool>(type: "INTEGER", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "TEXT", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_projects", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "work_items",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "TEXT", nullable: false),
                    project_id = table.Column<Guid>(type: "TEXT", nullable: false),
                    parent_id = table.Column<Guid>(type: "TEXT", nullable: true),
                    item_type = table.Column<string>(type: "TEXT", maxLength: 30, nullable: false),
                    name = table.Column<string>(type: "TEXT", maxLength: 500, nullable: false),
                    unit = table.Column<string>(type: "TEXT", maxLength: 50, nullable: true),
                    quantity = table.Column<decimal>(type: "TEXT", precision: 18, scale: 4, nullable: true),
                    duration = table.Column<int>(type: "INTEGER", nullable: false),
                    start_date = table.Column<DateOnly>(type: "TEXT", nullable: true),
                    finish_date = table.Column<DateOnly>(type: "TEXT", nullable: true),
                    progress_percent = table.Column<decimal>(type: "TEXT", precision: 5, scale: 2, nullable: false),
                    machine_shift_factor = table.Column<decimal>(type: "TEXT", precision: 18, scale: 4, nullable: true),
                    nclm = table.Column<decimal>(type: "TEXT", precision: 18, scale: 4, nullable: true),
                    permanent_labor = table.Column<decimal>(type: "TEXT", precision: 18, scale: 4, nullable: true),
                    sort_order = table.Column<int>(type: "INTEGER", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "TEXT", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_work_items", x => x.id);
                    table.ForeignKey(
                        name: "FK_work_items_projects_project_id",
                        column: x => x.project_id,
                        principalTable: "projects",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_work_items_work_items_parent_id",
                        column: x => x.parent_id,
                        principalTable: "work_items",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "task_dependencies",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "TEXT", nullable: false),
                    project_id = table.Column<Guid>(type: "TEXT", nullable: false),
                    predecessor_task_id = table.Column<Guid>(type: "TEXT", nullable: false),
                    successor_task_id = table.Column<Guid>(type: "TEXT", nullable: false),
                    dependency_type = table.Column<string>(type: "TEXT", maxLength: 2, nullable: false),
                    lag_days = table.Column<int>(type: "INTEGER", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "TEXT", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_task_dependencies", x => x.id);
                    table.ForeignKey(
                        name: "FK_task_dependencies_projects_project_id",
                        column: x => x.project_id,
                        principalTable: "projects",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_task_dependencies_work_items_predecessor_task_id",
                        column: x => x.predecessor_task_id,
                        principalTable: "work_items",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_task_dependencies_work_items_successor_task_id",
                        column: x => x.successor_task_id,
                        principalTable: "work_items",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ux_projects_code",
                table: "projects",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_task_dependencies_predecessor",
                table: "task_dependencies",
                column: "predecessor_task_id");

            migrationBuilder.CreateIndex(
                name: "ix_task_dependencies_project_id",
                table: "task_dependencies",
                column: "project_id");

            migrationBuilder.CreateIndex(
                name: "ix_task_dependencies_successor",
                table: "task_dependencies",
                column: "successor_task_id");

            migrationBuilder.CreateIndex(
                name: "ux_task_dependencies_relation",
                table: "task_dependencies",
                columns: new[] { "project_id", "predecessor_task_id", "successor_task_id", "dependency_type" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_work_items_parent_id",
                table: "work_items",
                column: "parent_id");

            migrationBuilder.CreateIndex(
                name: "ix_work_items_project_id",
                table: "work_items",
                column: "project_id");

            migrationBuilder.CreateIndex(
                name: "ix_work_items_project_parent_sort",
                table: "work_items",
                columns: new[] { "project_id", "parent_id", "sort_order" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "task_dependencies");

            migrationBuilder.DropTable(
                name: "work_items");

            migrationBuilder.DropTable(
                name: "projects");
        }
    }
}
