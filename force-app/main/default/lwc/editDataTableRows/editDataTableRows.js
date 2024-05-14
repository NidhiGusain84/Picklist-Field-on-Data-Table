import { LightningElement, api, wire } from 'lwc';
import getContactsBasedOnAccount from '@salesforce/apex/ContactController.getContactsBasedOnAccount';
import { deleteRecord, updateRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import { getObjectInfo, getPicklistValues } from 'lightning/uiObjectInfoApi';
import CONTACT_OBJECT from '@salesforce/schema/Contact';
import LEAD_SOURCE_FIELD from '@salesforce/schema/Contact.LeadSource';

const ACTIONS = [
    { label: 'View', name: 'view' },
    { label: 'Edit', name: 'edit' },
    { label: 'Delete', name: 'delete' }
];
const DEFAULT_ACTIONS = [{ label: 'All', checked: true, name: 'all' }];

const COLUMNS = [
    { label: 'First Name', fieldName: 'FirstName', editable: true, hideDefaultActions: true },
    { label: 'Last Name', fieldName: 'LastName', editable: true, hideDefaultActions: true },
    { label: 'Title', fieldName: 'Title', editable: true, hideDefaultActions: true },
    { label: 'Phone', fieldName: 'Phone', type: 'phone', hideDefaultActions: true },
    { label: 'Email', fieldName: 'Email', type: 'email', hideDefaultActions: true },
    {
        label: 'Lead Source', fieldName: 'LeadSource', type: 'customPicklist', editable: true, hideDefaultActions: true,
        actions: DEFAULT_ACTIONS,
        typeAttributes: {
            options: { fieldName: 'picklistOptions' },
            value: { fieldName: 'LeadSource' },
            context: { fieldName: 'Id' }
        }
    }, {
        label: 'Case Count', fieldName: 'numberOfCases', type: 'number', editable: false, hideDefaultActions: true
    },
    {
        label: 'Is Bad Contact', fieldName: 'isBadContact', type: 'boolean', editable: false, hideDefaultActions: true
    },
    { type: 'action', typeAttributes: { rowActions: ACTIONS } }
];

export default class EditDataTableRows extends LightningElement {
    @api recordId;
    contactData = [];
    columns = COLUMNS;
    draftValues = [];
    contactRefreshProp;
    leadSourceOptions = [];
    viewMode = false;
    editMode = false;
    showModal = false;
    selectedRecordId;
    leadSourceActions = [];
    loadActionCompleted = false;
    contactAllData = [];
    disableMe = true;

    @wire(getContactsBasedOnAccount, {
        accountId: "$recordId",
        pickList: "$leadSourceOptions"
    })
    getContactsOutput(result) {
        this.contactRefreshProp = result;
        if (result.data) {
            this.contactData = result.data.map(currentItem => {
                let picklistOptions = this.leadSourceOptions;
                return {
                    ...currentItem,
                    picklistOptions: picklistOptions
                };
            });
            this.contactAllData = [...this.contactData];
        } else if (result.error) {
            console.log("Error while loading records.");
        }
    }

    @wire(getObjectInfo, {
        objectApiName: CONTACT_OBJECT
    }) objectInfo;

    @wire(getPicklistValues, {
        recordTypeId: "$objectInfo.data.defaultRecordTypeId",
        fieldApiName: LEAD_SOURCE_FIELD
    }) wiredPicklist({ data, error }) {
        if (data) {
            this.leadSourceOptions = data.values;
            this.leadSourceActions = [];

            data.values.forEach(currentItem => {
                this.leadSourceActions.push({
                    label: currentItem.label,
                    checked: false,
                    name: currentItem.value
                });
            });
            this.columns.forEach(currentItem => {
                if (currentItem.fieldName === 'LeadSource') {
                    currentItem.actions = [...currentItem.actions, ...this.leadSourceActions];
                }
            });
            this.loadActionCompleted = true;

        } else if (error) {
            console.log("Error while loading data", error);
        }
    }

    async saveHandler(event) {
        let records = event.detail.draftValues;
        let updatedRecordsArray = records.map(currentItem => {
            let fieldInput = { ...currentItem };
            return {
                fields: fieldInput
            }
        });

        this.draftValues = [];
        let updateRecordsArrayPromise = updatedRecordsArray.map((currentItem) =>
            updateRecord(currentItem)
        );

        await Promise.all(updateRecordsArrayPromise);
        const toastEvent = new ShowToastEvent({
            title: 'Success',
            variant: 'success',
            message: 'Record updated successfully.',
        });
        this.dispatchEvent(toastEvent);
        await refreshApex(this.contactRefreshProp);
    }

    rowActionHandler(event) {
        let action = event.detail.action;
        let selectedRow = event.detail.row;
        this.selectedRecordId = selectedRow.Id;
        this.viewMode = false;
        this.editMode = false;
        this.showModal = false;

        if (action.name === 'view') {
            this.viewMode = true;
            this.showModal = true;
        }
        else if (action.name === 'edit') {
            this.editMode = true;
            this.showModal = true;
        }
        else if (action.name === 'delete') {
            this.deleteHandler();
        }
    }

    async deleteHandler() {
        try {
            await deleteRecord(this.selectedRecordId);

            const toastEvent = new ShowToastEvent({
                title: 'Success',
                variant: 'success',
                message: 'Record deleted successfully.',
            });
            this.dispatchEvent(toastEvent);

            await refreshApex(this.contactRefreshProp);
        } catch (error) {
            const toastEvent = new ShowToastEvent({
                title: 'Error',
                variant: 'error',
                message: error.body.message,
            });
            this.dispatchEvent(toastEvent);
        }

    }


    async closeModal() {
        this.showModal = false;
        if (this.editMode) {
            await refreshApex(this.contactRefreshProp);
        }
    }

    headerActionHandler(event) {
        let actionName = event.detail.action.name;
        const cols = [...this.columns];
        console.log('actionName', actionName);
        console.log('cols', cols);

        if (actionName === 'all') {
            this.contactData = [...this.contactAllData];
        } else {
            this.contactData = this.contactAllData.filter(currentItem => actionName === currentItem['LeadSource']);
        }

        cols.find((currentItem) => currentItem.fieldName === 'LeadSource')
            .actions.forEach((currentItem) => {
                if (currentItem.name === actionName) {
                    currentItem.checked = true;
                } else {
                    currentItem.checked = false;
                }
            });
        this.columns = [...cols]
    }

    get displayData() {
        if (this.contactData && this.loadActionCompleted === true) {
            return true;
        } else {
            return false;
        }
    }

    async deleteRecordHandler(event) {
        let selectedRecords = this.template.querySelector("c-custom-data-type").getSelectedRows();

        let allGoodRecords = true;

        let selectedRecordsHaveCases = selectedRecords.filter((currentItem) =>
            currentItem.numberOfCases > 0
        );

        if (selectedRecordsHaveCases.length > 0) {
            allGoodRecords = false;
        }

        if (allGoodRecords) {
            let deletedRecordsConfirmation = selectedRecords.map((currentItem) => deleteRecord(currentItem.Id));

            try {
                await Promise.all(deletedRecordsConfirmation);
                const toastEvent = new ShowToastEvent({
                    title: 'Success',
                    variant: 'success',
                    message: 'Records deleated sccessfully',
                });
                this.dispatchEvent(toastEvent);
                this.template.querySelector("c-custom-data-type").selectedRows = [];
                await refreshApex(this.contactRefreshProp);

            } catch (error) {
                console.log("Error while deleting records", error);
                const toastEvent = new ShowToastEvent({
                    title: 'Error',
                    variant: 'error',
                    message: 'Delete Failed' + error.body.message,
                });
                this.dispatchEvent(toastEvent);
            }

        } else {
            const toastEvent = new ShowToastEvent({
                title: 'Error',
                variant: 'error',
                message: 'Selected contacts have active cases.',
            });
            this.dispatchEvent(toastEvent);
        }

    }

    selectedRowHandler(event) {
        const selectedRows = event.detail.selectedRows;
        if (selectedRows.length > 0) {
            this.disableMe = false;
        } else {
            this.disableMe = true;
        }

    }

}